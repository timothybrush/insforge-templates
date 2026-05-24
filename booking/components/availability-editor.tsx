'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DAY_LABELS } from '@/lib/constants';
import { addBlackout, removeBlackout, setAvailability } from '@/lib/provider-actions';
import type { Availability, Blackout } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

type Slot = { day_of_week: number; start_time: string; end_time: string };

function normalize(slot: Availability): Slot {
  return {
    day_of_week: slot.day_of_week,
    start_time: slot.start_time.slice(0, 5),
    end_time: slot.end_time.slice(0, 5),
  };
}

export function AvailabilityEditor({
  providerId,
  initialWindows,
  initialBlackouts,
}: {
  providerId: string;
  initialWindows: Availability[];
  initialBlackouts: Blackout[];
}) {
  const [slots, setSlots] = useState<Slot[]>(initialWindows.map(normalize));
  const [isSaving, setIsSaving] = useState(false);

  const [blackoutStart, setBlackoutStart] = useState('');
  const [blackoutEnd, setBlackoutEnd] = useState('');
  const [blackoutReason, setBlackoutReason] = useState('');
  const [blackouts, setBlackouts] = useState<Blackout[]>(initialBlackouts);
  const [blackoutSubmitting, setBlackoutSubmitting] = useState(false);

  function addSlot(dow: number) {
    setSlots((current) => [
      ...current,
      { day_of_week: dow, start_time: '09:00', end_time: '17:00' },
    ]);
  }

  function updateSlot(index: number, patch: Partial<Slot>) {
    setSlots((current) =>
      current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  }

  function removeSlot(index: number) {
    setSlots((current) => current.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await setAvailability({ providerId, windows: slots });
    if (result.success) {
      toast.success('Weekly schedule saved.');
    } else {
      toast.error(result.error);
    }
    setIsSaving(false);
  }

  async function handleAddBlackout(e: React.FormEvent) {
    e.preventDefault();
    if (!blackoutStart || !blackoutEnd) {
      toast.error('Start and end are required.');
      return;
    }
    setBlackoutSubmitting(true);
    const result = await addBlackout({
      providerId,
      start_at: new Date(blackoutStart).toISOString(),
      end_at: new Date(blackoutEnd).toISOString(),
      reason: blackoutReason,
    });
    if (result.success) {
      toast.success('Blackout added.');
      setBlackoutStart('');
      setBlackoutEnd('');
      setBlackoutReason('');
      // Optimistically refresh — server-side data will update on next nav.
      // For an SPA-ish feel we'd reload via router.refresh().
      window.location.reload();
    } else {
      toast.error(result.error);
    }
    setBlackoutSubmitting(false);
  }

  async function handleRemoveBlackout(id: string) {
    const result = await removeBlackout(id);
    if (result.success) {
      setBlackouts((current) => current.filter((b) => b.id !== id));
      toast.success('Blackout removed.');
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Weekly schedule</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recurring hours customers can book within. Use 24-hour clock in your local timezone.
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : 'Save schedule'}
          </Button>
        </div>

        <div className="grid gap-4">
          {DAY_LABELS.map((day, dow) => {
            const daySlots = slots.filter((s) => s.day_of_week === dow);
            return (
              <div key={day} className="glass-panel p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">{day}</p>
                  <Button type="button" size="sm" variant="ghost" onClick={() => addSlot(dow)}>
                    <Plus className="size-3.5" />
                    Add window
                  </Button>
                </div>
                {daySlots.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">Closed</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {slots.map((slot, idx) =>
                      slot.day_of_week === dow ? (
                        <li key={idx} className="flex items-center gap-2">
                          <input
                            type="time"
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            value={slot.start_time}
                            onChange={(e) => updateSlot(idx, { start_time: e.target.value })}
                          />
                          <span className="text-muted-foreground">→</span>
                          <input
                            type="time"
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            value={slot.end_time}
                            onChange={(e) => updateSlot(idx, { end_time: e.target.value })}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSlot(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-3xl">Blackouts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One-off windows when you can't take bookings — vacation, sick day, time off.
          </p>
        </div>

        <div className="glass-panel space-y-4 p-5">
          <form onSubmit={handleAddBlackout} className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
            <input
              type="datetime-local"
              required
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={blackoutStart}
              onChange={(e) => setBlackoutStart(e.target.value)}
            />
            <input
              type="datetime-local"
              required
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={blackoutEnd}
              onChange={(e) => setBlackoutEnd(e.target.value)}
            />
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Reason (optional)"
              value={blackoutReason}
              onChange={(e) => setBlackoutReason(e.target.value)}
            />
            <Button type="submit" disabled={blackoutSubmitting}>
              {blackoutSubmitting ? <Loader2 className="size-4 animate-spin" /> : 'Add'}
            </Button>
          </form>

          {blackouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blackouts scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {blackouts.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {formatDateTime(b.start_at)} → {formatDateTime(b.end_at)}
                    </span>
                    {b.reason ? (
                      <span className="ml-2 text-muted-foreground">— {b.reason}</span>
                    ) : null}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleRemoveBlackout(b.id)}>
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
