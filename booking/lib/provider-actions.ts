'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedSession } from '@/lib/auth-session';
import { createInsforgeServerClient } from '@/lib/insforge';

type Result = { success: true } | { success: false; error: string };

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export async function upsertMyProvider(input: {
  business_name: string;
  slug?: string;
  headline?: string;
  description?: string;
  location?: string;
  timezone?: string;
  cover_image_url?: string;
  avatar_url?: string;
  is_published?: boolean;
}): Promise<Result> {
  const session = await requireAuthenticatedSession();
  const insforge = createInsforgeServerClient({ accessToken: session.accessToken });

  const businessName = input.business_name.trim();
  if (!businessName) {
    return { success: false, error: 'Business name is required.' };
  }

  const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(businessName)) || `provider-${Date.now()}`;

  const { data: existing } = await insforge.database
    .from('providers')
    .select('id')
    .eq('user_id', session.viewer.id)
    .maybeSingle();

  const payload = {
    user_id: session.viewer.id,
    slug,
    business_name: businessName,
    headline: input.headline?.trim() || null,
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    timezone: input.timezone?.trim() || 'America/New_York',
    cover_image_url: input.cover_image_url?.trim() || null,
    avatar_url: input.avatar_url?.trim() || null,
    is_published: input.is_published ?? true,
  };

  if (existing) {
    const { error } = await insforge.database
      .from('providers')
      .update(payload)
      .eq('id', existing.id);

    if (error) return { success: false, error: error.message ?? 'Update failed.' };
  } else {
    const { error } = await insforge.database.from('providers').insert([payload]);
    if (error) return { success: false, error: error.message ?? 'Create failed.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/profile');
  revalidatePath(`/providers/${slug}`);
  revalidatePath('/providers');
  return { success: true };
}

export async function createService(input: {
  providerId: string;
  name: string;
  short_description?: string;
  description?: string;
  duration_min: number;
  price_cents: number;
  image_url?: string;
  is_active?: boolean;
}): Promise<Result> {
  const session = await requireAuthenticatedSession();
  const insforge = createInsforgeServerClient({ accessToken: session.accessToken });

  const name = input.name.trim();
  if (!name) return { success: false, error: 'Name is required.' };

  const slug = slugify(name) || `service-${Date.now()}`;

  const { error } = await insforge.database.from('services').insert([
    {
      provider_id: input.providerId,
      name,
      slug,
      short_description: input.short_description?.trim() || null,
      description: input.description?.trim() || null,
      duration_min: input.duration_min,
      price_cents: input.price_cents,
      image_url: input.image_url?.trim() || null,
      is_active: input.is_active ?? true,
    },
  ]);

  if (error) return { success: false, error: error.message ?? 'Create failed.' };
  revalidatePath('/dashboard/services');
  return { success: true };
}

export async function updateService(input: {
  serviceId: string;
  name: string;
  short_description?: string;
  description?: string;
  duration_min: number;
  price_cents: number;
  image_url?: string;
  is_active?: boolean;
}): Promise<Result> {
  const session = await requireAuthenticatedSession();
  const insforge = createInsforgeServerClient({ accessToken: session.accessToken });

  const { error } = await insforge.database
    .from('services')
    .update({
      name: input.name.trim(),
      short_description: input.short_description?.trim() || null,
      description: input.description?.trim() || null,
      duration_min: input.duration_min,
      price_cents: input.price_cents,
      image_url: input.image_url?.trim() || null,
      is_active: input.is_active ?? true,
    })
    .eq('id', input.serviceId);

  if (error) return { success: false, error: error.message ?? 'Update failed.' };
  revalidatePath('/dashboard/services');
  revalidatePath(`/dashboard/services/${input.serviceId}/edit`);
  return { success: true };
}

export async function deleteService(serviceId: string): Promise<Result> {
  const session = await requireAuthenticatedSession();
  const insforge = createInsforgeServerClient({ accessToken: session.accessToken });

  const { error } = await insforge.database
    .from('services')
    .delete()
    .eq('id', serviceId);

  if (error) return { success: false, error: error.message ?? 'Delete failed.' };
  revalidatePath('/dashboard/services');
  return { success: true };
}

type AvailabilityInput = {
  day_of_week: number;
  start_time: string; // 'HH:MM'
  end_time: string;   // 'HH:MM'
};

export async function setAvailability(input: {
  providerId: string;
  windows: AvailabilityInput[];
}): Promise<Result> {
  const session = await requireAuthenticatedSession();
  const insforge = createInsforgeServerClient({ accessToken: session.accessToken });

  const { error: deleteError } = await insforge.database
    .from('availabilities')
    .delete()
    .eq('provider_id', input.providerId);

  if (deleteError) {
    return { success: false, error: deleteError.message ?? 'Could not reset availability.' };
  }

  if (input.windows.length === 0) {
    revalidatePath('/dashboard/availability');
    return { success: true };
  }

  const rows = input.windows.map((w) => ({
    provider_id: input.providerId,
    day_of_week: w.day_of_week,
    start_time: w.start_time.length === 5 ? `${w.start_time}:00` : w.start_time,
    end_time: w.end_time.length === 5 ? `${w.end_time}:00` : w.end_time,
  }));

  const { error } = await insforge.database.from('availabilities').insert(rows);

  if (error) return { success: false, error: error.message ?? 'Save failed.' };
  revalidatePath('/dashboard/availability');
  return { success: true };
}

export async function addBlackout(input: {
  providerId: string;
  start_at: string;
  end_at: string;
  reason?: string;
}): Promise<Result> {
  const session = await requireAuthenticatedSession();
  const insforge = createInsforgeServerClient({ accessToken: session.accessToken });

  const { error } = await insforge.database.from('blackouts').insert([
    {
      provider_id: input.providerId,
      start_at: input.start_at,
      end_at: input.end_at,
      reason: input.reason?.trim() || null,
    },
  ]);

  if (error) return { success: false, error: error.message ?? 'Add blackout failed.' };
  revalidatePath('/dashboard/availability');
  return { success: true };
}

export async function removeBlackout(blackoutId: string): Promise<Result> {
  const session = await requireAuthenticatedSession();
  const insforge = createInsforgeServerClient({ accessToken: session.accessToken });

  const { error } = await insforge.database.from('blackouts').delete().eq('id', blackoutId);
  if (error) return { success: false, error: error.message ?? 'Remove blackout failed.' };
  revalidatePath('/dashboard/availability');
  return { success: true };
}
