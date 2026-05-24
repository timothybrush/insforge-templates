import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { DashboardNav } from '@/components/dashboard-nav';
import { ServiceForm } from '@/components/service-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import {
  persistRefreshedSession,
  requireAuthenticatedSession,
} from '@/lib/auth-session';
import { getMyProvider } from '@/lib/provider-dashboard';

export const dynamic = 'force-dynamic';

export default async function NewServicePage() {
  const session = await requireAuthenticatedSession();
  await persistRefreshedSession(session);
  const provider = await getMyProvider(session.accessToken, session.viewer.id);
  if (!provider) notFound();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-shell grid gap-8 py-12 lg:grid-cols-[240px_1fr]">
        <DashboardNav />

        <div className="space-y-6">
          <Button asChild variant="ghost" className="-ml-4 w-fit">
            <Link href="/dashboard/services">
              <ArrowLeft className="size-4" />
              All services
            </Link>
          </Button>

          <header className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">New</p>
            <h1 className="font-display text-5xl">Add a service</h1>
          </header>

          <section className="glass-panel p-6 sm:p-8">
            <ServiceForm providerId={provider.id} />
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
