'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TimeSlotPicker } from '@/components/time-slot-picker';
import { Button } from '@/components/ui/button';
import { createBooking } from '@/lib/booking-actions';
import type { TimeSlot } from '@/lib/types';

type Group = { dateKey: string; slots: TimeSlot[] };

export function BookingForm({
  serviceId,
  timezone,
  groups,
}: {
  serviceId: string;
  timezone: string;
  groups: Group[];
}) {
  const router = useRouter();
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slot) {
      toast.error('Pick a time first.');
      return;
    }

    setIsSubmitting(true);
    const result = await createBooking({
      serviceId,
      startAt: slot.start,
      endAt: slot.end,
      notes,
    });

    if (result.success) {
      toast.success('Booking requested — the provider will confirm shortly.');
      router.push(`/account/bookings/${result.bookingId}`);
    } else {
      toast.error(result.error);
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <TimeSlotPicker
        groups={groups}
        timezone={timezone}
        value={slot}
        onChange={setSlot}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="notes">
          Anything the provider should know? <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="First session, any prep, accessibility needs..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || !slot}>
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          'Request booking'
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Times shown in the provider&apos;s timezone ({timezone}).
      </p>
    </form>
  );
}
