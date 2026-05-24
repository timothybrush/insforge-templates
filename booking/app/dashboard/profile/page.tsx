import { DashboardNav } from '@/components/dashboard-nav';
import { ProviderProfileForm } from '@/components/provider-profile-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import {
  persistRefreshedSession,
  requireAuthenticatedSession,
} from '@/lib/auth-session';
import { getMyProvider } from '@/lib/provider-dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardProviderProfilePage() {
  const session = await requireAuthenticatedSession();
  await persistRefreshedSession(session);
  const provider = await getMyProvider(session.accessToken, session.viewer.id);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-shell grid gap-8 py-12 lg:grid-cols-[240px_1fr]">
        <DashboardNav />

        <div className="space-y-6">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Provider</p>
            <h1 className="font-display text-5xl">Profile</h1>
            <p className="text-sm text-muted-foreground">
              Updates appear on your public provider page immediately.
            </p>
          </header>

          <section className="glass-panel p-6 sm:p-8">
            <ProviderProfileForm provider={provider} mode={provider ? 'edit' : 'onboarding'} />
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
