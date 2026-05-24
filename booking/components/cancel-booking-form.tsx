'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cancelBooking } from '@/lib/booking-actions';

export function CancelBookingForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await cancelBooking(bookingId, reason);
    if (result.success) {
      toast.success('Booking cancelled.');
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="text-sm font-medium" htmlFor="cancel-reason">
        Reason <span className="text-muted-foreground">(optional)</span>
      </label>
      <textarea
        id="cancel-reason"
        rows={2}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="Let the other side know why."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button type="submit" variant="destructive" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : 'Cancel booking'}
      </Button>
    </form>
  );
}
