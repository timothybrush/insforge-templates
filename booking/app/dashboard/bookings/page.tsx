import { notFound } from 'next/navigation';
import { BookingsTable } from '@/components/bookings-table';
import { DashboardNav } from '@/components/dashboard-nav';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import {
  persistRefreshedSession,
  requireAuthenticatedSession,
} from '@/lib/auth-session';
import { getMyProvider, getMyProviderBookings } from '@/lib/provider-dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardBookingsPage() {
  const session = await requireAuthenticatedSession();
  await persistRefreshedSession(session);
  const provider = await getMyProvider(session.accessToken, session.viewer.id);
  if (!provider) notFound();

  const bookings = await getMyProviderBookings(provider.id, session.accessToken);

  const now = Date.now();
  const upcoming = bookings.filter(
    (b) =>
      new Date(b.start_at).getTime() >= now &&
      !['cancelled', 'declined', 'completed'].includes(b.status),
  );
  const past = bookings.filter(
    (b) =>
      new Date(b.start_at).getTime() < now ||
      ['cancelled', 'declined', 'completed'].includes(b.status),
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-shell grid gap-8 py-12 lg:grid-cols-[240px_1fr]">
        <DashboardNav />

        <div className="space-y-10">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Provider</p>
            <h1 className="font-display text-5xl">Bookings</h1>
          </header>

          <section className="space-y-4">
            <h2 className="font-display text-2xl">Upcoming</h2>
            <BookingsTable
              bookings={upcoming}
              viewerRole="provider"
              hrefPrefix="/dashboard/bookings"
              emptyMessage="No upcoming bookings right now."
            />
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-2xl">Past & cancelled</h2>
            <BookingsTable
              bookings={past}
              viewerRole="provider"
              hrefPrefix="/dashboard/bookings"
              emptyMessage="Nothing in the archive yet."
            />
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
