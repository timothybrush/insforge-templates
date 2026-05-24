import Link from 'next/link';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/constants';

export function SiteFooter() {
  return (
    <footer className="border-t border-black/5 py-10">
      <div className="page-shell flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-2xl text-foreground">{SITE_NAME}</p>
          <p className="mt-1 max-w-md">{SITE_DESCRIPTION}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/providers" className="hover:text-foreground">Browse providers</Link>
          <Link href="/account/bookings" className="hover:text-foreground">My bookings</Link>
          <Link href="/dashboard" className="hover:text-foreground">Provider dashboard</Link>
        </div>
      </div>
    </footer>
  );
}
