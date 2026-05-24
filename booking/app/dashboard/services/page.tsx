import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { DashboardNav } from '@/components/dashboard-nav';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import {
  persistRefreshedSession,
  requireAuthenticatedSession,
} from '@/lib/auth-session';
import { getMyProvider, getMyServices } from '@/lib/provider-dashboard';
import { formatCurrency, formatDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardServicesPage() {
  const session = await requireAuthenticatedSession();
  await persistRefreshedSession(session);
  const provider = await getMyProvider(session.accessToken, session.viewer.id);
  if (!provider) notFound();

  const services = await getMyServices(provider.id, session.accessToken);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-shell grid gap-8 py-12 lg:grid-cols-[240px_1fr]">
        <DashboardNav />

        <div className="space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Provider</p>
              <h1 className="font-display text-5xl">Services</h1>
            </div>
            <Button asChild>
              <Link href="/dashboard/services/new">
                <Plus className="size-4" />
                Add service
              </Link>
            </Button>
          </header>

          {services.length === 0 ? (
            <div className="glass-panel py-12 text-center text-muted-foreground">
              No services yet. Click <strong>Add service</strong> to create your first one.
            </div>
          ) : (
            <ul className="grid gap-4">
              {services.map((service) => (
                <li key={service.id} className="glass-panel flex flex-wrap items-center gap-4 p-5">
                  {service.image_url ? (
                    <Image
                      src={service.image_url}
                      alt={service.name}
                      width={64}
                      height={64}
                      className="rounded-xl object-cover"
                    />
                  ) : (
                    <div className="size-16 rounded-xl bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{service.name}</p>
                      {!service.is_active ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                          Hidden
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDuration(service.duration_min)} · {formatCurrency(service.price_cents)}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/services/${service.id}/edit`}>Edit</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
