'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  completeBooking,
  confirmBooking,
  declineBooking,
} from '@/lib/booking-actions';
import type { BookingStatus } from '@/lib/types';

export function BookingStatusActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'confirm' | 'decline' | 'complete'>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineInput, setShowDeclineInput] = useState(false);

  async function handleConfirm() {
    setBusy('confirm');
    const result = await confirmBooking(bookingId);
    if (result.success) {
      toast.success('Booking confirmed.');
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setBusy(null);
  }

  async function handleDecline() {
    setBusy('decline');
    const result = await declineBooking(bookingId, declineReason);
    if (result.success) {
      toast.success('Booking declined.');
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setBusy(null);
    setShowDeclineInput(false);
  }

  async function handleComplete() {
    setBusy('complete');
    const result = await completeBooking(bookingId);
    if (result.success) {
      toast.success('Marked as completed.');
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setBusy(null);
  }

  if (status === 'pending') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleConfirm} disabled={busy !== null}>
            {busy === 'confirm' ? <Loader2 className="size-4 animate-spin" /> : 'Confirm booking'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeclineInput((v) => !v)}
            disabled={busy !== null}
          >
            Decline
          </Button>
        </div>
        {showDeclineInput ? (
          <div className="space-y-2">
            <textarea
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Optional note for the customer."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
            <Button size="sm" variant="destructive" onClick={handleDecline} disabled={busy !== null}>
              {busy === 'decline' ? <Loader2 className="size-4 animate-spin" /> : 'Confirm decline'}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleComplete} disabled={busy !== null}>
          {busy === 'complete' ? <Loader2 className="size-4 animate-spin" /> : 'Mark completed'}
        </Button>
      </div>
    );
  }

  return null;
}
