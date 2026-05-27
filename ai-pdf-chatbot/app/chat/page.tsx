'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ChatShell } from '@/components/chat-shell';
import { ChatInput } from '@/components/chat-input';
import { ChatMessage } from '@/components/chat-message';
import { CitationRail } from '@/components/citation-rail';
import { useChatStream } from '@/lib/stream/use-chat-stream';
import type { ChatMessageRow } from '@/lib/types';

type Citation = ChatMessageRow['citations'][number];

type DocSummaryRow = {
  id: string;
  file_name: string;
  status: 'processing' | 'ready' | 'failed';
  summary: string | null;
  suggested_questions: string[];
};

export default function ChatHomePage() {
  const router = useRouter();
  const { state, send } = useChatStream();
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  const [citations] = useState<Citation[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Pull a few suggested questions from the most recently uploaded, ready
  // document so a brand-new chat has a one-tap starting point. Falls back
  // to the empty state if no doc is ready yet.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch('/api/documents');
      if (!res.ok) return;
      const data = (await res.json()) as { documents: DocSummaryRow[] };
      if (cancelled) return;
      const newest = data.documents?.find(
        (d) => d.status === 'ready' && Array.isArray(d.suggested_questions) && d.suggested_questions.length > 0,
      );
      setSuggestions(newest?.suggested_questions ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(input: string) {
    setPendingInput(input);
    const result = await send({ input });
    if (!result) {
      if (state.phase === 'error') toast.error(state.message);
      return;
    }
    if (result.chatId) router.push(`/chat/${result.chatId}`);
  }

  const streamingText = state.phase === 'streaming' ? state.text : '';
  const streamingCitations = state.phase === 'streaming' ? state.citations : citations;

  return (
    <ChatShell rail={<CitationRail citations={streamingCitations} />}>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {pendingInput ? (
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <ChatMessage role="user" content={pendingInput} />
            {streamingText ? (
              <ChatMessage role="assistant" content={streamingText} citations={streamingCitations} isStreaming />
            ) : (
              <p className="text-sm text-muted-foreground">Thinking…</p>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-6 py-12 text-center">
            <h1 className="font-display text-4xl">Chat with your PDFs</h1>
            <p className="text-sm text-muted-foreground">
              Upload a PDF on the <a className="underline" href="/documents">documents page</a>, then ask a question here.
            </p>

            {suggestions.length > 0 ? (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="size-3" />
                  Try one of these
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void handleSubmit(q)}
                      className="rounded-xl border border-border bg-card/60 px-4 py-3 text-left text-sm transition hover:bg-muted/60"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <ChatInput disabled={state.phase === 'streaming'} onSubmit={handleSubmit} />
    </ChatShell>
  );
}
