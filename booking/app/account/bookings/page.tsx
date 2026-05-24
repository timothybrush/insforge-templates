import { BookingsTable } from '@/components/bookings-table';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { requireAuthenticatedSession, persistRefreshedSession } from '@/lib/auth-session';
import { getMyBookings } from '@/lib/account-bookings';

export const dynamic = 'force-dynamic';

export default async function MyBookingsPage() {
  const session = await requireAuthenticatedSession();
  await persistRefreshedSession(session);

  const allBookings = await getMyBookings(session.accessToken);
  // Customer-scoped: keep only rows the viewer booked (not ones they host).
  const myBookings = allBookings.filter((b) => b.customer_id === session.viewer.id);

  const now = Date.now();
  const upcoming = myBookings.filter(
    (b) => new Date(b.start_at).getTime() >= now && !['cancelled', 'declined', 'completed'].includes(b.status),
  );
  const past = myBookings.filter(
    (b) => new Date(b.start_at).getTime() < now || ['cancelled', 'declined', 'completed'].includes(b.status),
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-shell space-y-10 py-12">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Customer dashboard</p>
          <h1 className="font-display text-5xl">My bookings</h1>
        </header>

        <section className="space-y-4">
          <h2 className="font-display text-2xl">Upcoming</h2>
          <BookingsTable
            bookings={upcoming}
            viewerRole="customer"
            hrefPrefix="/account/bookings"
            emptyMessage="Nothing booked yet — browse providers to schedule something."
          />
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl">Past & cancelled</h2>
          <BookingsTable
            bookings={past}
            viewerRole="customer"
            hrefPrefix="/account/bookings"
            emptyMessage="No past bookings yet."
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
