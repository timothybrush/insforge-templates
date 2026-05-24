import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { getServiceById } from '@/lib/marketplace';
import { formatCurrency, formatDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ id: string }>;

export default async function ServicePage({ params }: { params: RouteParams }) {
  const { id } = await params;
  const service = await getServiceById(id);
  if (!service) notFound();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="space-y-10 pb-20">
        <div className="page-shell pt-6">
          {service.provider ? (
            <Button asChild variant="ghost" className="-ml-4">
              <Link href={`/providers/${service.provider.slug}`}>
                <ArrowLeft className="size-4" />
                Back to {service.provider.business_name}
              </Link>
            </Button>
          ) : null}
        </div>

        <section className="page-shell grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="glass-panel overflow-hidden">
            <div className="relative aspect-[4/3]">
              {service.image_url ? (
                <Image
                  src={service.image_url}
                  alt={service.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="(min-width: 1280px) 60vw, 100vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            <div className="space-y-4 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Service</p>
                  <h1 className="font-display text-5xl">{service.name}</h1>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl">{formatCurrency(service.price_cents)}</p>
                  <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {formatDuration(service.duration_min)}
                  </p>
                </div>
              </div>
              {service.description ? (
                <p className="text-muted-foreground whitespace-pre-line">{service.description}</p>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="glass-panel p-6">
              <h2 className="font-display text-3xl">Book this service</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick a time on the next page — we'll show only slots that fit the provider's schedule.
              </p>
              <Button asChild className="mt-5 w-full">
                <Link href={`/book/${service.id}`}>Continue</Link>
              </Button>
            </div>

            {service.provider ? (
              <div className="glass-panel p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Provider</p>
                <Link
                  href={`/providers/${service.provider.slug}`}
                  className="mt-3 flex items-center gap-3 hover:underline"
                >
                  {service.provider.avatar_url ? (
                    <Image
                      src={service.provider.avatar_url}
                      alt={service.provider.business_name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : null}
                  <div>
                    <p className="font-medium">{service.provider.business_name}</p>
                    {service.provider.location ? (
                      <p className="text-xs text-muted-foreground">{service.provider.location}</p>
                    ) : null}
                  </div>
                </Link>
              </div>
            ) : null}
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
