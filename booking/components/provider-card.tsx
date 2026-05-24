import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import type { Provider } from '@/lib/types';

export function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <Link href={`/providers/${provider.slug}`} className="group glass-panel overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-muted/60">
        {provider.cover_image_url ? (
          <Image
            src={provider.cover_image_url}
            alt={provider.business_name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No cover image
          </div>
        )}
        {provider.rating_count > 0 && provider.rating_average ? (
          <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-background/95 px-3 py-1 text-xs font-medium shadow-sm">
            <Star className="size-3 fill-current text-amber-500" />
            {Number(provider.rating_average).toFixed(1)}
            <span className="text-muted-foreground">({provider.rating_count})</span>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-3xl leading-tight">{provider.business_name}</h3>
        </div>

        {provider.headline ? (
          <p className="min-h-12 text-sm text-muted-foreground">{provider.headline}</p>
        ) : null}

        {provider.location ? (
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <MapPin className="size-3" />
            {provider.location}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
