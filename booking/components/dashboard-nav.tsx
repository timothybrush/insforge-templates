'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarRange,
  CalendarCheck,
  LayoutDashboard,
  Sliders,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/dashboard/services', label: 'Services', icon: Sliders },
  { href: '/dashboard/availability', label: 'Availability', icon: CalendarRange },
  { href: '/dashboard/profile', label: 'Profile', icon: UserRound },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-panel p-3">
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
