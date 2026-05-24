import { addDays, addMinutes, isAfter, isBefore, parse } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { BOOKING_CUTOFF_MINUTES, SLOT_GRANULARITY_MINUTES } from '@/lib/constants';
import type { Availability, Blackout, TimeSlot } from '@/lib/types';

type Range = { start: Date; end: Date };

function rangesOverlap(a: Range, b: Range) {
  return isBefore(a.start, b.end) && isAfter(a.end, b.start);
}

/**
 * Compute open booking slots for a service.
 *
 * Inputs are interpreted as:
 *   - `availabilities`: provider's weekly recurring schedule expressed in wall-clock
 *     times within `timezone`.
 *   - `blackouts` and `bookedRanges`: UTC instants stored as ISO strings.
 *
 * The algorithm walks forward `daysAhead` days from `now`, projects each weekly
 * window into UTC, then enumerates start times at `granularityMin` intervals.
 * A slot is included only when it fits entirely inside the window, does not
 * overlap any blackout or existing booking, and is at least `cutoffMin` ahead
 * of `now`.
 */
export function computeAvailableSlots(args: {
  durationMin: number;
  timezone: string;
  availabilities: Availability[];
  blackouts: Blackout[];
  bookedRanges: { start_at: string; end_at: string }[];
  now?: Date;
  daysAhead?: number;
  granularityMin?: number;
  cutoffMin?: number;
}): TimeSlot[] {
  const {
    durationMin,
    timezone,
    availabilities,
    blackouts,
    bookedRanges,
    now = new Date(),
    daysAhead = 14,
    granularityMin = SLOT_GRANULARITY_MINUTES,
    cutoffMin = BOOKING_CUTOFF_MINUTES,
  } = args;

  const earliestStart = addMinutes(now, cutoffMin);
  const horizon = addDays(now, daysAhead);

  const blackoutRanges: Range[] = blackouts.map((b) => ({
    start: new Date(b.start_at),
    end: new Date(b.end_at),
  }));
  const bookedRangesNorm: Range[] = bookedRanges.map((b) => ({
    start: new Date(b.start_at),
    end: new Date(b.end_at),
  }));

  const slots: TimeSlot[] = [];

  for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
    const cursorLocal = toZonedTime(addDays(now, dayOffset), timezone);
    const dow = cursorLocal.getDay();
    const yyyy = cursorLocal.getFullYear();
    const mm = String(cursorLocal.getMonth() + 1).padStart(2, '0');
    const dd = String(cursorLocal.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;

    const windows = availabilities.filter((a) => a.day_of_week === dow);
    if (windows.length === 0) continue;

    for (const window of windows) {
      const windowStartLocal = parse(
        `${dateString} ${window.start_time}`,
        'yyyy-MM-dd HH:mm:ss',
        new Date(),
      );
      const windowEndLocal = parse(
        `${dateString} ${window.end_time}`,
        'yyyy-MM-dd HH:mm:ss',
        new Date(),
      );

      const windowStartUtc = fromZonedTime(windowStartLocal, timezone);
      const windowEndUtc = fromZonedTime(windowEndLocal, timezone);

      let cursor = windowStartUtc;
      while (true) {
        const candidateEnd = addMinutes(cursor, durationMin);
        if (isAfter(candidateEnd, windowEndUtc)) break;
        if (isAfter(candidateEnd, horizon)) break;

        if (!isBefore(cursor, earliestStart)) {
          const range = { start: cursor, end: candidateEnd };
          const collides =
            blackoutRanges.some((b) => rangesOverlap(range, b)) ||
            bookedRangesNorm.some((b) => rangesOverlap(range, b));

          if (!collides) {
            slots.push({
              start: cursor.toISOString(),
              end: candidateEnd.toISOString(),
            });
          }
        }

        cursor = addMinutes(cursor, granularityMin);
      }
    }
  }

  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Group slots by the provider-local calendar date so the picker can render a
 * "per-day" column layout without duplicating timezone math in the component.
 */
export function groupSlotsByLocalDay(slots: TimeSlot[], timezone: string) {
  const groups = new Map<string, TimeSlot[]>();

  for (const slot of slots) {
    const local = toZonedTime(new Date(slot.start), timezone);
    const yyyy = local.getFullYear();
    const mm = String(local.getMonth() + 1).padStart(2, '0');
    const dd = String(local.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const list = groups.get(key) ?? [];
    list.push(slot);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, dateSlots]) => ({ dateKey, slots: dateSlots }));
}
