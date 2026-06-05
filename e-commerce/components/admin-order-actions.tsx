'use client';

import { useState, useTransition } from 'react';
import { Loader2, PackageCheck, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { markOrderDeliveredAction, markOrderShippedAction } from '@/lib/store-actions';
import { Button } from '@/components/ui/button';

export function AdminOrderActions({
  orderId,
  fulfillmentStatus,
  currentTracking,
}: {
  orderId: string;
  fulfillmentStatus: string;
  currentTracking: string | null;
}) {
  const [tracking, setTracking] = useState(currentTracking ?? '');
  const [pending, startTransition] = useTransition();

  const canShip = fulfillmentStatus === 'processing' || fulfillmentStatus === 'unfulfilled';
  const canDeliver = fulfillmentStatus === 'shipped';

  if (!canShip && !canDeliver) return null;

  function handleShip() {
    startTransition(async () => {
      try {
        await markOrderShippedAction({ orderId, trackingNumber: tracking });
        toast.success('Order marked as shipped');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to mark as shipped');
      }
    });
  }

  function handleDeliver() {
    startTransition(async () => {
      try {
        await markOrderDeliveredAction({ orderId });
        toast.success('Order marked as delivered');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to mark as delivered');
      }
    });
  }

  return (
    <section className="glass-panel space-y-4 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Admin actions</p>
        <h2 className="font-display text-2xl">Update fulfillment</h2>
      </div>

      {canShip ? (
        <div className="space-y-3">
          <label className="block space-y-2 text-sm">
            <span>Tracking number (optional)</span>
            <input
              className="h-11 w-full rounded-2xl border border-input bg-background px-4"
              placeholder="1Z999AA10123456784"
              value={tracking}
              onChange={(event) => setTracking(event.target.value)}
            />
          </label>
          <Button disabled={pending} onClick={handleShip} type="button">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
            Mark as shipped
          </Button>
        </div>
      ) : null}

      {canDeliver ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Shipped on {' '}
            {currentTracking ? <span className="font-mono">{currentTracking}</span> : 'no tracking number'}
          </p>
          <Button disabled={pending} onClick={handleDeliver} type="button">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
            Mark as delivered
          </Button>
        </div>
      ) : null}
    </section>
  );
}
