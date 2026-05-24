import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="page-shell grid min-h-[calc(100dvh-4rem)] gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-panel relative overflow-hidden bg-[linear-gradient(135deg,rgba(28,31,42,0.94),rgba(58,76,124,0.86))] px-8 py-10 text-white sm:px-12">
          <div className="hero-grid absolute inset-0 opacity-40" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="space-y-8">
              <Button asChild variant="ghost" className="-ml-4 w-fit text-white hover:bg-white/10 hover:text-white">
                <Link href="/">
                  <ArrowLeft className="size-4" />
                  Back to marketplace
                </Link>
              </Button>

              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.35em] text-white/60">{eyebrow}</p>
                <h1 className="max-w-xl font-display text-5xl leading-none text-balance sm:text-6xl">
                  Book the people you trust.
                </h1>
                <p className="max-w-md text-base text-white/72 sm:text-lg">
                  Discover providers, pick a time that works, and message them after — all powered by an InsForge backend.
                </p>
              </div>
            </div>

            <div className="grid gap-4 border-white/10 pt-10 text-sm text-white/70 sm:grid-cols-3">
              <div>
                <p className="font-medium text-white">One account</p>
                <p className="mt-1">Book today, host services tomorrow.</p>
              </div>
              <div>
                <p className="font-medium text-white">Live availability</p>
                <p className="mt-1">See the times each provider actually has open.</p>
              </div>
              <div>
                <p className="font-medium text-white">Direct messaging</p>
                <p className="mt-1">Coordinate with the provider once booked.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel flex items-center px-6 py-10 sm:px-10">
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
              <h2 className="font-display text-4xl text-balance">{title}</h2>
              <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
