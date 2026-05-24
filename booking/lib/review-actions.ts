'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedSession } from '@/lib/auth-session';
import { createInsforgeServerClient } from '@/lib/insforge';

type Result = { success: true } | { success: false; error: string };

export async function submitReview(input: {
  bookingId: string;
  providerId: string;
  rating: number;
  body?: string;
}): Promise<Result> {
  const session = await requireAuthenticatedSession();
  const insforge = createInsforgeServerClient({ accessToken: session.accessToken });

  if (input.rating < 1 || input.rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5.' };
  }

  const { data: existing } = await insforge.database
    .from('reviews')
    .select('id')
    .eq('booking_id', input.bookingId)
    .maybeSingle();

  const payload = {
    booking_id: input.bookingId,
    provider_id: input.providerId,
    customer_id: session.viewer.id,
    rating: input.rating,
    body: input.body?.trim() || null,
  };

  if (existing) {
    const { error } = await insforge.database
      .from('reviews')
      .update({ rating: payload.rating, body: payload.body })
      .eq('id', existing.id);

    if (error) return { success: false, error: error.message ?? 'Update failed.' };
  } else {
    const { error } = await insforge.database.from('reviews').insert([payload]);
    if (error) return { success: false, error: error.message ?? 'Submit failed.' };
  }

  revalidatePath(`/account/bookings/${input.bookingId}`);
  revalidatePath(`/providers`);
  return { success: true };
}
