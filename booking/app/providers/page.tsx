import { Suspense } from 'react';
import { ProviderCard } from '@/components/provider-card';
import { ProviderDirectorySearch } from '@/components/provider-directory-search';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getPublishedProviders } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ search?: string }>;

export default async function ProvidersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const providers = await getPublishedProviders({ search: params.search ?? null });

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-shell space-y-10 py-12">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Marketplace</p>
          <h1 className="font-display text-5xl">Browse providers</h1>
          <p className="max-w-2xl text-muted-foreground">
            Independent providers running their booking workflow on InsForge. Tap any card to see services, availability, and reviews.
          </p>

          <Suspense fallback={null}>
            <ProviderDirectorySearch />
          </Suspense>
        </div>

        {providers.length === 0 ? (
          <div className="glass-panel flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-display text-3xl">No providers match yet</p>
            <p className="text-sm text-muted-foreground">
              Try a different keyword, or clear the search to see everyone.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
