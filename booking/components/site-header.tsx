import Link from 'next/link';
import { CalendarRange } from 'lucide-react';
import { AccountDropdown } from '@/components/account-dropdown';
import { SITE_NAME } from '@/lib/constants';
import { getCurrentAuthState } from '@/lib/auth-state';
import { cn, getInitials, getViewerLabel } from '@/lib/utils';

const navItems = [
  { href: '/providers', label: 'Browse providers' },
  { href: '/account/bookings', label: 'My bookings' },
];

export async function SiteHeader({ compact = false }: { compact?: boolean }) {
  const { viewer } = await getCurrentAuthState();
  const viewerLabel = getViewerLabel(viewer.name, viewer.email);
  const viewerInitials = getInitials(viewerLabel);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-black/5 bg-background/85 backdrop-blur-xl',
        compact && 'relative bg-transparent',
      )}
    >
      <div className="page-shell flex h-18 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-display text-3xl tracking-tight">
            <CalendarRange className="size-6 text-accent" />
            {SITE_NAME}
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {viewer.isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="hidden rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground sm:inline-flex"
              >
                Provider dashboard
              </Link>
              <AccountDropdown
                avatarUrl={viewer.avatarUrl}
                email={viewer.email}
                viewerInitials={viewerInitials}
                viewerLabel={viewerLabel}
              />
            </>
          ) : (
            <>
              <Link
                href="/auth/sign-in"
                className="inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
