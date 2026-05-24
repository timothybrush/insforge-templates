export const SITE_NAME = 'InsForge Booking';
export const SITE_DESCRIPTION =
  'A two-sided booking marketplace where customers discover providers and book services. Built by InsForge.';
export const BOOKING_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'declined', label: 'Declined' },
] as const;
export const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
export const SLOT_GRANULARITY_MINUTES = 30;
export const BOOKING_CUTOFF_MINUTES = 60;
