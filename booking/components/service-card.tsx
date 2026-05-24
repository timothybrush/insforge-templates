import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Service } from '@/lib/types';
import { formatCurrency, formatDuration } from '@/lib/utils';

export function ServiceCard({ service, ctaLabel = 'Book' }: { service: Service; ctaLabel?: string }) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="grid gap-4 p-5 sm:grid-cols-[140px_1fr]">
        {service.image_url ? (
          <div className="relative aspect-square overflow-hidden rounded-[18px] bg-muted/60 sm:aspect-auto">
            <Image
              src={service.image_url}
              alt={service.name}
              fill
              className="object-cover"
              sizes="(min-width: 640px) 140px, 100vw"
            />
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}
        <div className="flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <h3 className="font-display text-2xl leading-tight">{service.name}</h3>
            {service.short_description ? (
              <p className="text-sm text-muted-foreground">{service.short_description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3.5" />
                {formatDuration(service.duration_min)}
              </span>
              <span className="font-medium text-foreground">{formatCurrency(service.price_cents)}</span>
            </div>
            <Button asChild size="sm" className="rounded-full">
              <Link href={`/services/${service.id}`}>
                {ctaLabel}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
