import { notFound } from 'next/navigation';
import { AvailabilityEditor } from '@/components/availability-editor';
import { DashboardNav } from '@/components/dashboard-nav';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import {
  persistRefreshedSession,
  requireAuthenticatedSession,
} from '@/lib/auth-session';
import {
  getMyAvailability,
  getMyBlackouts,
  getMyProvider,
} from '@/lib/provider-dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardAvailabilityPage() {
  const session = await requireAuthenticatedSession();
  await persistRefreshedSession(session);
  const provider = await getMyProvider(session.accessToken, session.viewer.id);
  if (!provider) notFound();

  const [availability, blackouts] = await Promise.all([
    getMyAvailability(provider.id, session.accessToken),
    getMyBlackouts(provider.id, session.accessToken),
  ]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-shell grid gap-8 py-12 lg:grid-cols-[240px_1fr]">
        <DashboardNav />

        <div className="space-y-6">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Provider</p>
            <h1 className="font-display text-5xl">Availability</h1>
            <p className="text-sm text-muted-foreground">
              Times shown in your provider timezone:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{provider.timezone}</code>
            </p>
          </header>

          <AvailabilityEditor
            providerId={provider.id}
            initialWindows={availability}
            initialBlackouts={blackouts}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
