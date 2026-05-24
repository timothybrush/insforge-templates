import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(valueInCents: number) {
  return currencyFormatter.format(valueInCents / 100);
}

export function formatShortDate(value: string | Date) {
  return format(new Date(value), 'MMM d, yyyy');
}

export function formatDateTime(value: string | Date) {
  return format(new Date(value), 'MMM d, yyyy · h:mm a');
}

export function formatTime(value: string | Date) {
  return format(new Date(value), 'h:mm a');
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`;
}

export function getViewerLabel(name: string | null, email: string | null) {
  return name?.trim() || email?.trim() || 'Account';
}

export function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'A';
}
