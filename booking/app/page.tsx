import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, Clock, MessageSquare, Search, Star } from 'lucide-react';
import { ProviderCard } from '@/components/provider-card';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { getFeaturedProviders } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const providers = await getFeaturedProviders();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="space-y-20 pb-20">
        <section className="page-shell grid items-center gap-10 py-12 lg:grid-cols-[5fr_6fr] lg:gap-14 lg:py-16">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent" />
              Now booking · 3 providers
            </span>

            <h1 className="font-display text-balance text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Book the people you'd
              <br className="hidden sm:block" />
              <em className="not-italic text-accent">actually</em> spend an hour with.
            </h1>

            <p className="max-w-md text-base text-muted-foreground sm:text-lg">
              Yoga, photography, pilates, coaching, and more — pick a time, send a note, and the
              provider takes it from there.
            </p>

            <form action="/providers" className="flex max-w-md items-center gap-2 rounded-full border border-border bg-white/70 p-1.5 shadow-sm focus-within:border-foreground/30">
              <Search className="ml-3 size-4 text-muted-foreground" />
              <input
                name="search"
                type="search"
                placeholder="Search by name, service, or city"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button type="submit" size="sm" className="rounded-full px-4">
                Search
                <ArrowRight className="size-3.5" />
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="uppercase tracking-wide">Popular:</span>
              {['Yoga', 'Photography', 'Pilates', 'Coaching'].map((tag) => (
                <Link
                  key={tag}
                  href={`/providers?search=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-border bg-card/60 px-3 py-1 hover:border-foreground/30 hover:text-foreground"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] shadow-xl shadow-black/5 sm:aspect-[5/4]">
              <Image
                src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1600&q=80"
                alt="A morning yoga session"
                fill
                priority
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
            </div>

            <div className="absolute -bottom-6 left-4 right-4 grid gap-3 sm:left-6 sm:right-auto sm:max-w-xs">
              <div className="rounded-3xl border border-white/40 bg-white/90 p-4 shadow-[0_24px_60px_-30px_rgba(28,31,42,0.5)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="relative size-10 overflow-hidden rounded-full">
                    <Image
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&q=80"
                      alt="Aria Studio"
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">Aria Studio</p>
                    <p className="text-xs text-muted-foreground">Private Vinyasa · 60 min</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3" />
                    Today · 4:00 PM
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-900">
                    Available
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute -top-3 right-4 hidden rounded-2xl border border-white/40 bg-white/90 px-3 py-2 shadow-md backdrop-blur sm:right-6 sm:flex sm:items-center sm:gap-2">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
              <span className="text-sm font-medium">5.0</span>
              <span className="text-xs text-muted-foreground">· 1 review</span>
            </div>
          </div>
        </section>

        <section className="page-shell space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Featured</p>
              <h2 className="mt-2 font-display text-5xl">Providers worth scheduling time with.</h2>
            </div>
            <Link href="/providers" className="text-sm text-muted-foreground hover:text-foreground">
              Browse all providers
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </section>

        <section className="page-shell grid gap-5 lg:grid-cols-3">
          {[
            {
              title: 'Pick a time',
              copy: 'Open availability is computed from the provider\'s weekly schedule, blackouts, and existing bookings.',
              icon: CalendarCheck,
            },
            {
              title: 'Confirm together',
              copy: 'Providers see the request, accept it, and decline anything that won\'t work — every transition is audited.',
              icon: Star,
            },
            {
              title: 'Talk it out',
              copy: 'Per-booking messages keep logistics in one thread between you and the provider — no group chats, no spam.',
              icon: MessageSquare,
            },
          ].map((step) => (
            <div key={step.title} className="glass-panel flex flex-col gap-4 p-6">
              <div className="size-12 rounded-full bg-accent/12 text-accent flex items-center justify-center">
                <step.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">How it works</p>
                <h3 className="mt-2 font-display text-3xl">{step.title}</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">{step.copy}</p>
              </div>
            </div>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
