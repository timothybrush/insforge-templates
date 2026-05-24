import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { BookingStatusActions } from '@/components/booking-status-actions';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import { DashboardNav } from '@/components/dashboard-nav';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { MessagingThread } from '@/components/messaging-thread';
import { getBookingForViewer, getBookingMessages } from '@/lib/account-bookings';
import {
  persistRefreshedSession,
  requireAuthenticatedSession,
} from '@/lib/auth-session';
import { getMyProvider } from '@/lib/provider-dashboard';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ id: string }>;

export default async function DashboardBookingDetailPage({ params }: { params: RouteParams }) {
  const session = await requireAuthenticatedSession();
  await persistRefreshedSession(session);
  const { id } = await params;

  const provider = await getMyProvider(session.accessToken, session.viewer.id);
  if (!provider) notFound();

  const booking = await getBookingForViewer(id, session.accessToken);
  if (!booking || booking.provider_id !== provider.id) {
    notFound();
  }

  const messages = await getBookingMessages(id, session.accessToken);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-shell grid gap-8 py-12 lg:grid-cols-[240px_1fr]">
        <DashboardNav />

        <div className="space-y-6">
          <Button asChild variant="ghost" className="-ml-4 w-fit">
            <Link href="/dashboard/bookings">
              <ArrowLeft className="size-4" />
              All bookings
            </Link>
          </Button>

          <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
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
                    {booking.customer ? (
                      <div className="mt-3 flex items-center gap-3">
                        {booking.customer.avatar_url ? (
                          <Image
                            src={booking.customer.avatar_url}
                            alt={booking.customer.display_name ?? 'Customer'}
                            width={36}
                            height={36}
                            className="rounded-full"
                          />
                        ) : null}
                        <div>
                          <p className="font-medium">
                            {booking.customer.display_name ?? 'Customer'}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>

                <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">When</dt>
                    <dd className="mt-1 font-medium">{formatDateTime(booking.start_at)}</dd>
                    <dd className="text-xs text-muted-foreground">{provider.timezone}</dd>
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
                      Customer note
                    </p>
                    <p className="mt-2 whitespace-pre-line">{booking.customer_notes}</p>
                  </div>
                ) : null}
              </div>

              <div className="glass-panel p-6 sm:p-8">
                <h2 className="font-display text-2xl">Messages</h2>
                <div className="mt-4">
                  <MessagingThread
                    bookingId={booking.id}
                    viewerId={session.viewer.id}
                    messages={messages}
                  />
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="glass-panel p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Actions</p>
                <div className="mt-4">
                  <BookingStatusActions bookingId={booking.id} status={booking.status} />
                  {booking.status === 'completed' ? (
                    <p className="text-sm text-muted-foreground">Marked completed.</p>
                  ) : booking.status === 'cancelled' || booking.status === 'declined' ? (
                    <p className="text-sm text-muted-foreground">
                      Closed: {booking.cancelled_reason ?? 'no reason given'}
                    </p>
                  ) : null}
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
