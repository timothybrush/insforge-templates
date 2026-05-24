'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendBookingMessage } from '@/lib/messaging-actions';
import type { BookingMessage } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

export function MessagingThread({
  bookingId,
  viewerId,
  messages,
}: {
  bookingId: string;
  viewerId: string;
  messages: BookingMessage[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;

    setIsSending(true);
    const result = await sendBookingMessage({ bookingId, body: draft });
    if (result.success) {
      setDraft('');
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setIsSending(false);
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No messages yet — say hi, or share any prep details.
        </p>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => {
            const isMine = message.sender_id === viewerId;
            return (
              <li
                key={message.id}
                className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                    isMine
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  <p className="whitespace-pre-line">{message.body}</p>
                  <p
                    className={cn(
                      'mt-1 text-[10px] uppercase tracking-wide',
                      isMine ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {message.sender?.display_name ?? (isMine ? 'You' : 'Them')} ·{' '}
                    {formatDateTime(message.created_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form className="flex items-end gap-2" onSubmit={handleSubmit}>
        <textarea
          rows={2}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Type a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" disabled={isSending || !draft.trim()}>
          {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
