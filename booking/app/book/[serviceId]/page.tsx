import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { addDays } from 'date-fns';
import { BookingForm } from '@/components/booking-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { getCurrentAuthState } from '@/lib/auth-state';
import { computeAvailableSlots, groupSlotsByLocalDay } from '@/lib/availability';
import {
  getBlackoutsForRange,
  getBookedSlotsForRange,
  getProviderAvailability,
  getServiceById,
} from '@/lib/marketplace';
import { formatCurrency, formatDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ serviceId: string }>;

export default async function BookPage({ params }: { params: RouteParams }) {
  const { serviceId } = await params;
  const { viewer } = await getCurrentAuthState();

  if (!viewer.isAuthenticated) {
    redirect(`/auth/sign-in?next=/book/${serviceId}`);
  }

  const service = await getServiceById(serviceId);
  if (!service) notFound();

  const provider = service.provider;
  if (!provider) notFound();

  const now = new Date();
  const horizon = addDays(now, 14);

  const [availability, blackouts, bookedRanges] = await Promise.all([
    getProviderAvailability(provider.id),
    getBlackoutsForRange(provider.id, now.toISOString(), horizon.toISOString()),
    getBookedSlotsForRange(provider.id, now.toISOString(), horizon.toISOString()),
  ]);

  const slots = computeAvailableSlots({
    durationMin: service.duration_min,
    timezone: provider.timezone,
    availabilities: availability,
    blackouts,
    bookedRanges,
    now,
    daysAhead: 14,
  });
  const groups = groupSlotsByLocalDay(slots, provider.timezone);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="space-y-8 pb-20">
        <div className="page-shell pt-6">
          <Button asChild variant="ghost" className="-ml-4">
            <Link href={`/services/${service.id}`}>
              <ArrowLeft className="size-4" />
              Back to service
            </Link>
          </Button>
        </div>

        <section className="page-shell grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass-panel p-6 sm:p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Choose a time
            </p>
            <h1 className="mt-2 font-display text-4xl">{service.name}</h1>
            <p className="mt-2 text-muted-foreground">
              {provider.business_name} · {provider.location ?? provider.timezone}
            </p>

            <div className="mt-8">
              <BookingForm
                serviceId={service.id}
                timezone={provider.timezone}
                groups={groups}
              />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="glass-panel p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Summary</p>
              <div className="mt-4 flex items-start gap-3">
                {service.image_url ? (
                  <Image
                    src={service.image_url}
                    alt={service.name}
                    width={64}
                    height={64}
                    className="rounded-xl object-cover"
                  />
                ) : null}
                <div className="space-y-1">
                  <p className="font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDuration(service.duration_min)}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-2xl">{formatCurrency(service.price_cents)}</span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                You'll only be charged after the provider confirms — this booking starts as <em>pending</em>.
              </p>
            </div>

            <div className="glass-panel p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Booking as</p>
              <p className="mt-2 font-medium">{viewer.name ?? viewer.email}</p>
              <p className="text-sm text-muted-foreground">{viewer.email}</p>
            </div>
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
