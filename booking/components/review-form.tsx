'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { submitReview } from '@/lib/review-actions';
import { cn } from '@/lib/utils';
import type { Review } from '@/lib/types';

export function ReviewForm({
  bookingId,
  providerId,
  existing,
}: {
  bookingId: string;
  providerId: string;
  existing: Review | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [body, setBody] = useState(existing?.body ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await submitReview({ bookingId, providerId, rating, body });
    if (result.success) {
      toast.success(existing ? 'Review updated.' : 'Review submitted.');
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} stars`}
            className="rounded-full p-1"
          >
            <Star
              className={cn(
                'size-6 transition',
                value <= rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground',
              )}
            />
          </button>
        ))}
      </div>

      <textarea
        rows={3}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="What went well? What could've been better?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : existing ? (
          'Update review'
        ) : (
          'Submit review'
        )}
      </Button>
    </form>
  );
}
