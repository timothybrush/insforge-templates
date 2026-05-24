import Link from 'next/link';
import { ArrowRight, CalendarCheck, CheckCheck, Hourglass } from 'lucide-react';
import { DashboardNav } from '@/components/dashboard-nav';
import { ProviderProfileForm } from '@/components/provider-profile-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import {
  persistRefreshedSession,
  requireAuthenticatedSession,
} from '@/lib/auth-session';
import {
  getMyProvider,
  getMyProviderBookings,
  getMyServices,
} from '@/lib/provider-dashboard';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  const session = await requireAuthenticatedSession();
  await persistRefreshedSession(session);

  const provider = await getMyProvider(session.accessToken, session.viewer.id);

  if (!provider) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="page-shell max-w-3xl space-y-8 py-12">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Provider onboarding
            </p>
            <h1 className="font-display text-5xl">Create your provider page</h1>
            <p className="text-muted-foreground">
              Once you publish, your services and weekly hours go live on the marketplace at{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/providers/[slug]</code>.
            </p>
          </header>

          <section className="glass-panel p-6 sm:p-8">
            <ProviderProfileForm provider={null} mode="onboarding" />
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const [services, bookings] = await Promise.all([
    getMyServices(provider.id, session.accessToken),
    getMyProviderBookings(provider.id, session.accessToken),
  ]);

  const now = Date.now();
  const upcoming = bookings.filter(
    (b) =>
      new Date(b.start_at).getTime() >= now &&
      !['cancelled', 'declined', 'completed'].includes(b.status),
  );
  const pending = upcoming.filter((b) => b.status === 'pending');
  const confirmed = upcoming.filter((b) => b.status === 'confirmed');

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-shell grid gap-8 py-12 lg:grid-cols-[240px_1fr]">
        <DashboardNav />

        <div className="space-y-8">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              {provider.business_name}
            </p>
            <h1 className="font-display text-5xl">Overview</h1>
          </header>

          <section className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Pending requests',
                value: pending.length,
                icon: Hourglass,
                accent: 'bg-amber-100 text-amber-900',
              },
              {
                label: 'Confirmed upcoming',
                value: confirmed.length,
                icon: CalendarCheck,
                accent: 'bg-emerald-100 text-emerald-900',
              },
              {
                label: 'Active services',
                value: services.filter((s) => s.is_active).length,
                icon: CheckCheck,
                accent: 'bg-accent/12 text-accent',
              },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className={`flex size-9 items-center justify-center rounded-full ${stat.accent}`}>
                    <stat.icon className="size-4" />
                  </div>
                </div>
                <p className="mt-3 font-display text-4xl">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="glass-panel p-6">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-2xl">Next up</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/bookings">
                  View all
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            {upcoming.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No upcoming bookings yet — share your provider link to start.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {upcoming.slice(0, 5).map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{b.service?.name ?? 'Service'}</p>
                      <p className="text-xs text-muted-foreground">
                        with {b.customer?.display_name ?? 'Customer'} · {formatDateTime(b.start_at)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/bookings/${b.id}`}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Link
              href={`/providers/${provider.slug}`}
              className="glass-panel p-6 hover:shadow-md transition-shadow"
            >
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Public page</p>
              <p className="mt-2 font-medium">/providers/{provider.slug}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share this URL with customers to send bookings your way.
              </p>
            </Link>
            <Link
              href="/dashboard/services"
              className="glass-panel p-6 hover:shadow-md transition-shadow"
            >
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Manage</p>
              <p className="mt-2 font-medium">Services & availability</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add or update services, edit your weekly schedule, mark blackouts.
              </p>
            </Link>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
