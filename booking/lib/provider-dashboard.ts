import 'server-only';

import { createInsforgeServerClient } from '@/lib/insforge';
import type { Availability, Blackout, Booking, Profile, Provider, Service } from '@/lib/types';

type ProfileSnippet = Pick<Profile, 'user_id' | 'display_name' | 'avatar_url'>;

async function loadProfileSnippets(
  insforge: ReturnType<typeof buildClient>,
  userIds: string[],
): Promise<Map<string, ProfileSnippet>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return new Map();

  const { data, error } = await insforge.database
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', unique);

  if (error) throw new Error(error.message ?? 'Unable to load profile data.');
  return new Map((data ?? []).map((row) => [row.user_id, row as ProfileSnippet]));
}

function buildClient(accessToken: string) {
  return createInsforgeServerClient({ accessToken });
}

function assertNoError(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message ?? fallback);
}

export async function getMyProvider(accessToken: string, userId: string) {
  const insforge = buildClient(accessToken);
  const { data, error } = await insforge.database
    .from('providers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  assertNoError(error, 'Unable to load provider profile.');
  return (data ?? null) as Provider | null;
}

export async function getMyServices(providerId: string, accessToken: string) {
  const insforge = buildClient(accessToken);
  const { data, error } = await insforge.database
    .from('services')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  assertNoError(error, 'Unable to load services.');
  return (data ?? []) as Service[];
}

export async function getMyService(serviceId: string, providerId: string, accessToken: string) {
  const insforge = buildClient(accessToken);
  const { data, error } = await insforge.database
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .eq('provider_id', providerId)
    .maybeSingle();

  assertNoError(error, 'Unable to load service.');
  return (data ?? null) as Service | null;
}

export async function getMyAvailability(providerId: string, accessToken: string) {
  const insforge = buildClient(accessToken);
  const { data, error } = await insforge.database
    .from('availabilities')
    .select('*')
    .eq('provider_id', providerId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  assertNoError(error, 'Unable to load availability.');
  return (data ?? []) as Availability[];
}

export async function getMyBlackouts(providerId: string, accessToken: string) {
  const insforge = buildClient(accessToken);
  const { data, error } = await insforge.database
    .from('blackouts')
    .select('*')
    .eq('provider_id', providerId)
    .order('start_at', { ascending: true });

  assertNoError(error, 'Unable to load blackouts.');
  return (data ?? []) as Blackout[];
}

export async function getMyProviderBookings(providerId: string, accessToken: string) {
  const insforge = buildClient(accessToken);
  const { data, error } = await insforge.database
    .from('bookings')
    .select('*, service:service_id(id, name, duration_min, image_url)')
    .eq('provider_id', providerId)
    .order('start_at', { ascending: false });

  assertNoError(error, 'Unable to load bookings.');

  const profilesByUserId = await loadProfileSnippets(
    insforge,
    (data ?? []).map((row) => row.customer_id as string),
  );
  return (data ?? []).map((row) => ({
    ...(row as Booking),
    customer: profilesByUserId.get(row.customer_id as string) ?? null,
  }));
}
