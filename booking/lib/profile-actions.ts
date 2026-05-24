'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedSession } from '@/lib/auth-session';
import { createInsforgeServerClient } from '@/lib/insforge';

type Result = { success: true } | { success: false; error: string };

export async function upsertMyProfile(input: {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
}): Promise<Result> {
  const session = await requireAuthenticatedSession();
  const insforge = createInsforgeServerClient({ accessToken: session.accessToken });

  const payload = {
    user_id: session.viewer.id,
    display_name: input.display_name?.trim() || null,
    avatar_url: input.avatar_url?.trim() || null,
    bio: input.bio?.trim() || null,
    phone: input.phone?.trim() || null,
  };

  const { error: existingError, data: existing } = await insforge.database
    .from('profiles')
    .select('user_id')
    .eq('user_id', session.viewer.id)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message ?? 'Unable to load profile.' };
  }

  if (existing) {
    const { error } = await insforge.database
      .from('profiles')
      .update(payload)
      .eq('user_id', session.viewer.id);

    if (error) return { success: false, error: error.message ?? 'Update failed.' };
  } else {
    const { error } = await insforge.database.from('profiles').insert([payload]);
    if (error) return { success: false, error: error.message ?? 'Create failed.' };
  }

  revalidatePath('/account/profile');
  return { success: true };
}
