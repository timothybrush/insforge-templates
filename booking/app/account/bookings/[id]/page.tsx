import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import { CancelBookingForm } from '@/components/cancel-booking-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import {
  getBookingForViewer,
  getBookingMessages,
} from '@/lib/account-bookings';
import {
  persistRefreshedSession,
  requireAuthenticatedSession,
} from '@/lib/auth-session';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ id: string }>;

export default async function MyBookingDetailPage({ params }: { params: RouteParams }) {
  const session = await requireAuthenticatedSession();
  await persistRefreshedSession(session);
  const { id } = await params;

  const booking = await getBookingForViewer(id, session.accessToken);
  if (!booking || booking.customer_id !== session.viewer.id) {
    notFound();
  }

  const messages = await getBookingMessages(id, session.accessToken);
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="space-y-8 pb-20">
        <div className="page-shell pt-6">
          <Button asChild variant="ghost" className="-ml-4">
            <Link href="/account/bookings">
              <ArrowLeft className="size-4" />
              All bookings
            </Link>
          </Button>
        </div>

        <section className="page-shell grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <div className="glass-panel p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
                    Booking
                  </p>
                  <h1 className="mt-2 font-display text-4xl">
                    {booking.service?.name ?? 'Service'}
                  </h1>
                  {booking.provider ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      with{' '}
                      <Link
                        href={`/providers/${booking.provider.slug}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {booking.provider.business_name}
                      </Link>
                    </p>
                  ) : null}
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>

              <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">When</dt>
                  <dd className="mt-1 font-medium">{formatDateTime(booking.start_at)}</dd>
                  {booking.provider ? (
                    <dd className="text-xs text-muted-foreground">{booking.provider.timezone}</dd>
                  ) : null}
                </div>
                <div>
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="mt-1 inline-flex items-center gap-1 font-medium">
                    <Clock className="size-3.5" />
                    {formatDuration(booking.service?.duration_min ?? 60)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="mt-1 font-medium">{formatCurrency(booking.total_cents)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Booked</dt>
                  <dd className="mt-1">{formatDateTime(booking.created_at)}</dd>
                </div>
              </dl>

              {booking.customer_notes ? (
                <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Your note to the provider
                  </p>
                  <p className="mt-2 whitespace-pre-line">{booking.customer_notes}</p>
                </div>
              ) : null}

              {booking.cancelled_reason ? (
                <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                  <p className="text-xs uppercase tracking-wide text-destructive">
                    {booking.status === 'cancelled' ? 'Cancellation reason' : 'Provider note'}
                  </p>
                  <p className="mt-2 whitespace-pre-line">{booking.cancelled_reason}</p>
                </div>
              ) : null}
            </div>

            <div className="glass-panel p-6 sm:p-8">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Messages</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Provider-only chat lives here. {messages.length} so far.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                (Messaging UI lands with the next layer — RLS is already in place.)
              </p>
            </div>
          </div>

          <aside className="space-y-4">
            {booking.provider ? (
              <div className="glass-panel p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Provider</p>
                <Link
                  href={`/providers/${booking.provider.slug}`}
                  className="mt-3 flex items-center gap-3 hover:underline"
                >
                  {booking.provider.avatar_url ? (
                    <Image
                      src={booking.provider.avatar_url}
                      alt={booking.provider.business_name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : null}
                  <span className="font-medium">{booking.provider.business_name}</span>
                </Link>
              </div>
            ) : null}

            {canCancel ? (
              <div className="glass-panel p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
                  Need to cancel?
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Cancellation is immediate and frees up the slot for other customers.
                </p>
                <div className="mt-4">
                  <CancelBookingForm bookingId={booking.id} />
                </div>
              </div>
            ) : null}
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
