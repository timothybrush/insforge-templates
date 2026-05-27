'use client';

import { ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ChatMessageRow } from '@/lib/types';

type Citation = ChatMessageRow['citations'][number];

function OpenSourceButton({ cite }: { cite: Citation }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!cite.document_id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${cite.document_id}/url`);
      if (!res.ok) throw new Error('failed');
      const { url } = (await res.json()) as { url: string };
      const fragment = cite.page_number ? `#page=${cite.page_number}` : '';
      window.open(url + fragment, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not open source PDF');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || !cite.document_id}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> : <ExternalLink className="size-3" />}
      Open
    </button>
  );
}

export function CitationRail({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) {
    return (
      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card/30 p-4 text-sm text-muted-foreground lg:block">
        Sources cited in the assistant&apos;s answer will appear here.
      </aside>
    );
  }
  return (
    <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card/30 p-4 lg:block">
      <h2 className="mb-3 text-sm font-semibold">Sources</h2>
      <ol className="space-y-3">
        {citations.map((c) => (
          <li
            key={c.chunk_id}
            id={`citation-${c.marker}`}
            className="rounded-xl border border-border bg-card/60 p-3"
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="min-w-0 text-xs font-medium text-muted-foreground">
                [{c.marker}] {c.file_name}
                {c.page_number != null ? <> · page {c.page_number}</> : null}
              </div>
              {c.document_id ? <OpenSourceButton cite={c} /> : null}
            </div>
            <p className="text-xs text-foreground/80">{c.snippet}</p>
          </li>
        ))}
      </ol>
    </aside>
  );
}
