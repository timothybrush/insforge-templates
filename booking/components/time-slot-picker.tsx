'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { cn } from '@/lib/utils';
import type { TimeSlot } from '@/lib/types';

type Group = { dateKey: string; slots: TimeSlot[] };

export function TimeSlotPicker({
  groups,
  timezone,
  value,
  onChange,
}: {
  groups: Group[];
  timezone: string;
  value: TimeSlot | null;
  onChange: (slot: TimeSlot) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(
    groups[0]?.dateKey ?? null,
  );

  const activeGroup = useMemo(
    () => groups.find((g) => g.dateKey === selectedDate) ?? groups[0],
    [groups, selectedDate],
  );

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        No open slots in the next two weeks. Check back later or message the provider.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {groups.map((group) => {
          const localDate = toZonedTime(new Date(group.slots[0].start), timezone);
          const isActive = group.dateKey === (activeGroup?.dateKey ?? null);
          return (
            <button
              key={group.dateKey}
              type="button"
              onClick={() => setSelectedDate(group.dateKey)}
              className={cn(
                'flex min-w-[88px] flex-col items-center rounded-2xl border px-3 py-2 text-center transition',
                isActive
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card hover:border-foreground/40',
              )}
            >
              <span className="text-xs uppercase tracking-wide">
                {format(localDate, 'EEE')}
              </span>
              <span className="font-display text-2xl leading-none">
                {format(localDate, 'd')}
              </span>
              <span className="text-xs opacity-70">
                {format(localDate, 'MMM')}
              </span>
            </button>
          );
        })}
      </div>

      {activeGroup ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {activeGroup.slots.map((slot) => {
            const start = toZonedTime(new Date(slot.start), timezone);
            const isSelected = value?.start === slot.start;
            return (
              <button
                key={slot.start}
                type="button"
                onClick={() => onChange(slot)}
                className={cn(
                  'rounded-full border px-3 py-2 text-sm transition',
                  isSelected
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card hover:border-foreground/40',
                )}
              >
                {format(start, 'h:mm a')}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
