import { cn } from '@/lib/utils';
import type { BookingStatus } from '@/lib/types';

const STYLES: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  confirmed: 'bg-emerald-100 text-emerald-900',
  completed: 'bg-secondary text-secondary-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  declined: 'bg-destructive/15 text-destructive',
};

const LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide',
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
