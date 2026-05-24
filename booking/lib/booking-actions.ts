'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedSession } from '@/lib/auth-session';
import { createInsforgeServerClient } from '@/lib/insforge';
import type { BookingStatus } from '@/lib/types';

type BookingResult =
  | { success: true; bookingId: string }
  | { success: false; error: string };

export async function createBooking(input: {
  serviceId: string;
  startAt: string;
  endAt: string;
  notes?: string;
}): Promise<BookingResult> {
  const session = await requireAuthenticatedSession();
  const insforge = createInsforgeServerClient({ accessToken: session.accessToken });

  const { data: service, error: serviceError } = await insforge.database
    .from('services')
    .select('id, provider_id, price_cents, duration_min, is_active')
    .eq('id', input.serviceId)
    .maybeSingle();

  if (serviceError || !service) {
    return { success: false, error: 'Service not found.' };
  }
  if (!service.is_active) {
    return { success: false, error: 'This service is no longer accepting bookings.' };
  }

  const { data: inserted, error } = await insforge.database
    .from('bookings')
    .insert([
      {
        service_id: service.id,
        provider_id: service.provider_id,
        customer_id: session.viewer.id,
        start_at: input.startAt,
        end_at: input.endAt,
        status: 'pending' as BookingStatus,
        customer_notes: input.notes?.trim() || null,
        total_cents: service.price_cents,
      },
    ])
    .select('id')
    .maybeSingle();

  if (error || !inserted) {
    if (error?.message?.includes('bookings_provider_slot_unique')) {
      return {
        success: false,
        error: 'That time was just taken by another customer. Pick another slot.',
      };
    }
    return { success: false, error: error?.message ?? 'Booking failed.' };
  }

  revalidatePath('/account/bookings');
  revalidatePath('/dashboard/bookings');
  return { success: true, bookingId: inserted.id };
}

type StatusTransitionResult = { success: true } | { success: false; error: string };

async function updateBookingStatus(
  bookingId: string,
  patch: Record<string, unknown>,
): Promise<StatusTransitionResult> {
  const session = await requireAuthenticatedSession();
  const insforge = createInsforgeServerClient({ accessToken: session.accessToken });

  const { error } = await insforge.database
    .from('bookings')
    .update(patch)
    .eq('id', bookingId);

  if (error) {
    return { success: false, error: error.message ?? 'Could not update booking.' };
  }

  revalidatePath('/account/bookings');
  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath('/dashboard/bookings');
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return { success: true };
}

export async function cancelBooking(bookingId: string, reason?: string) {
  return updateBookingStatus(bookingId, {
    status: 'cancelled' as BookingStatus,
    cancelled_reason: reason?.trim() || null,
    cancelled_at: new Date().toISOString(),
  });
}

export async function confirmBooking(bookingId: string) {
  return updateBookingStatus(bookingId, { status: 'confirmed' as BookingStatus });
}

export async function declineBooking(bookingId: string, reason?: string) {
  return updateBookingStatus(bookingId, {
    status: 'declined' as BookingStatus,
    cancelled_reason: reason?.trim() || null,
    cancelled_at: new Date().toISOString(),
  });
}

export async function completeBooking(bookingId: string) {
  return updateBookingStatus(bookingId, { status: 'completed' as BookingStatus });
}
