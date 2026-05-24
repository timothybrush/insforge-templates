import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import { Button } from '@/components/ui/button';
import type { Booking } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function BookingsTable({
  bookings,
  viewerRole,
  hrefPrefix,
  emptyMessage,
}: {
  bookings: Booking[];
  /** Determines what the secondary line shows: provider name (for customer) or customer name (for provider). */
  viewerRole: 'customer' | 'provider';
  hrefPrefix: string;
  emptyMessage: string;
}) {
  if (bookings.length === 0) {
    return (
      <div className="glass-panel py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {bookings.map((booking) => {
        const counterparty =
          viewerRole === 'customer'
            ? booking.provider?.business_name ?? 'Provider'
            : booking.customer?.display_name ?? 'Customer';
        const avatar =
          viewerRole === 'customer'
            ? booking.provider?.avatar_url
            : booking.customer?.avatar_url;

        return (
          <li
            key={booking.id}
            className="glass-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={counterparty}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <div className="size-12 rounded-full bg-muted" />
              )}
              <div className="space-y-1">
                <p className="font-medium">{booking.service?.name ?? 'Service'}</p>
                <p className="text-xs text-muted-foreground">
                  {viewerRole === 'customer' ? 'with' : 'for'} {counterparty}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(booking.start_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                <BookingStatusBadge status={booking.status} />
                <span className="text-sm font-medium">
                  {formatCurrency(booking.total_cents)}
                </span>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`${hrefPrefix}/${booking.id}`}>
                  Details
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
