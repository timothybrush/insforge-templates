import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Star } from 'lucide-react';
import { ServiceCard } from '@/components/service-card';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { DAY_LABELS } from '@/lib/constants';
import {
  getProviderAvailability,
  getProviderBySlug,
  getProviderReviews,
} from '@/lib/marketplace';
import { formatShortDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ slug: string }>;

export default async function ProviderProfilePage({ params }: { params: RouteParams }) {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);

  if (!provider) {
    notFound();
  }

  const [availability, reviews] = await Promise.all([
    getProviderAvailability(provider.id),
    getProviderReviews(provider.id),
  ]);

  const services = provider.services ?? [];

  // Group recurring availability by day for display.
  const byDay = new Map<number, { start_time: string; end_time: string }[]>();
  for (const slot of availability) {
    const list = byDay.get(slot.day_of_week) ?? [];
    list.push({ start_time: slot.start_time, end_time: slot.end_time });
    byDay.set(slot.day_of_week, list);
  }

  function trimTime(t: string) {
    return t.slice(0, 5);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="space-y-12 pb-20">
        <div className="page-shell pt-6">
          <Button asChild variant="ghost" className="-ml-4">
            <Link href="/providers">
              <ArrowLeft className="size-4" />
              Back to providers
            </Link>
          </Button>
        </div>

        <section className="page-shell">
          <div className="glass-panel overflow-hidden">
            <div className="relative h-72 sm:h-96">
              {provider.cover_image_url ? (
                <Image
                  src={provider.cover_image_url}
                  alt={provider.business_name}
                  fill
                  priority
                  className="object-cover"
                  sizes="(min-width: 1280px) 80rem, 100vw"
                />
              ) : (
                <div className="h-full bg-muted" />
              )}
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:p-8">
              {provider.avatar_url ? (
                <div className="relative size-24 overflow-hidden rounded-full border-4 border-background -mt-16 md:size-32 md:-mt-20">
                  <Image
                    src={provider.avatar_url}
                    alt={provider.business_name}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
              ) : null}
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="font-display text-5xl">{provider.business_name}</h1>
                    {provider.headline ? (
                      <p className="mt-2 text-lg text-muted-foreground">{provider.headline}</p>
                    ) : null}
                  </div>
                  {provider.rating_count > 0 && provider.rating_average ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-secondary/70 px-4 py-2 text-sm font-medium">
                      <Star className="size-4 fill-current text-amber-500" />
                      {Number(provider.rating_average).toFixed(1)}
                      <span className="text-muted-foreground">({provider.rating_count} reviews)</span>
                    </div>
                  ) : null}
                </div>
                {provider.location ? (
                  <p className="flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted-foreground">
                    <MapPin className="size-4" />
                    {provider.location} · {provider.timezone}
                  </p>
                ) : null}
                {provider.description ? (
                  <p className="max-w-3xl text-muted-foreground">{provider.description}</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-3xl">Services</h2>
              <span className="text-sm text-muted-foreground">{services.length} offered</span>
            </div>
            <div className="space-y-4">
              {services.length === 0 ? (
                <div className="glass-panel py-10 text-center text-sm text-muted-foreground">
                  This provider hasn't published any services yet.
                </div>
              ) : (
                services.map((service) => <ServiceCard key={service.id} service={service} />)
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="glass-panel p-5">
              <h3 className="font-display text-2xl">Weekly availability</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {DAY_LABELS.map((day, index) => {
                  const slots = byDay.get(index) ?? [];
                  return (
                    <li key={day} className="flex items-start justify-between gap-4">
                      <span className="font-medium text-foreground">{day}</span>
                      <span className="text-right text-muted-foreground">
                        {slots.length === 0
                          ? 'Closed'
                          : slots
                              .map((slot) => `${trimTime(slot.start_time)} – ${trimTime(slot.end_time)}`)
                              .join(', ')}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Times shown in {provider.timezone}. Specific open slots appear on each service page.
              </p>
            </div>

            <div className="glass-panel p-5">
              <h3 className="font-display text-2xl">Recent reviews</h3>
              {reviews.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No reviews yet — be the first.
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <li key={review.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {review.customer?.display_name ?? 'Anonymous'}
                        </span>
                        <span>{formatShortDate(review.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3.5 ${
                              i < review.rating ? 'fill-current' : 'opacity-30'
                            }`}
                          />
                        ))}
                      </div>
                      {review.body ? <p className="text-sm">{review.body}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
