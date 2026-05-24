import 'server-only';

import { createInsforgeServerClient, getInsforgeServerClient } from '@/lib/insforge';
import type {
  Availability,
  Blackout,
  Booking,
  Profile,
  Provider,
  Review,
  Service,
} from '@/lib/types';

type ProfileSnippet = Pick<Profile, 'user_id' | 'display_name' | 'avatar_url'>;

async function loadProfileSnippets(
  insforge: InsforgeClient,
  userIds: string[],
): Promise<Map<string, ProfileSnippet>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return new Map();

  const { data, error } = await insforge.database
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', unique);

  if (error) {
    throw new Error(error.message ?? 'Unable to load profile data.');
  }

  return new Map((data ?? []).map((row) => [row.user_id, row as ProfileSnippet]));
}

type InsforgeClient = ReturnType<typeof createInsforgeServerClient>;

function getInsforge(accessToken?: string | null): InsforgeClient {
  if (accessToken) {
    return createInsforgeServerClient({ accessToken });
  }
  return getInsforgeServerClient();
}

function assertNoDatabaseError(error: { message?: string } | null, fallback: string) {
  if (error) {
    throw new Error(error.message ?? fallback);
  }
}

export async function getPublishedProviders(options?: {
  search?: string | null;
  limit?: number;
  accessToken?: string | null;
}) {
  const insforge = getInsforge(options?.accessToken);

  let query = insforge.database
    .from('providers')
    .select('*')
    .eq('is_published', true)
    .order('rating_average', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (options?.search?.trim()) {
    const term = options.search.trim();
    query = query.or(
      `business_name.ilike.%${term}%,headline.ilike.%${term}%,location.ilike.%${term}%`,
    );
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  assertNoDatabaseError(error, 'Unable to load providers.');
  return (data ?? []) as Provider[];
}

export async function getFeaturedProviders(accessToken?: string | null) {
  return getPublishedProviders({ limit: 6, accessToken });
}

export async function getProviderBySlug(slug: string, accessToken?: string | null) {
  const insforge = getInsforge(accessToken);

  const { data: provider, error } = await insforge.database
    .from('providers')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  assertNoDatabaseError(error, 'Unable to load provider.');
  if (!provider) return null;

  const [{ data: services, error: servicesError }, { data: reviewRows, error: reviewsError }] =
    await Promise.all([
      insforge.database
        .from('services')
        .select('*')
        .eq('provider_id', provider.id)
        .eq('is_active', true)
        .order('price_cents', { ascending: true }),
      insforge.database
        .from('reviews')
        .select('*')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

  assertNoDatabaseError(servicesError, 'Unable to load provider services.');
  assertNoDatabaseError(reviewsError, 'Unable to load reviews.');

  const profilesByUserId = await loadProfileSnippets(
    insforge,
    (reviewRows ?? []).map((r) => r.customer_id as string),
  );
  const reviews = (reviewRows ?? []).map((row) => ({
    ...(row as Review),
    customer: profilesByUserId.get(row.customer_id as string) ?? null,
  }));

  return {
    ...(provider as Provider),
    services: (services ?? []) as Service[],
    reviews,
  } as Provider & { services: Service[]; reviews: Review[] };
}

export async function getProviderReviews(providerId: string, accessToken?: string | null) {
  const insforge = getInsforge(accessToken);
  const { data, error } = await insforge.database
    .from('reviews')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(20);

  assertNoDatabaseError(error, 'Unable to load reviews.');

  const profilesByUserId = await loadProfileSnippets(
    insforge,
    (data ?? []).map((row) => row.customer_id as string),
  );
  return (data ?? []).map((row) => ({
    ...(row as Review),
    customer: profilesByUserId.get(row.customer_id as string) ?? null,
  }));
}

export async function getServiceById(serviceId: string, accessToken?: string | null) {
  const insforge = getInsforge(accessToken);
  const { data, error } = await insforge.database
    .from('services')
    .select('*, provider:provider_id(id, slug, business_name, avatar_url, timezone, location)')
    .eq('id', serviceId)
    .eq('is_active', true)
    .maybeSingle();

  assertNoDatabaseError(error, 'Unable to load service.');
  return (data ?? null) as Service | null;
}

export async function getProviderAvailability(
  providerId: string,
  accessToken?: string | null,
) {
  const insforge = getInsforge(accessToken);
  const { data, error } = await insforge.database
    .from('availabilities')
    .select('*')
    .eq('provider_id', providerId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  assertNoDatabaseError(error, 'Unable to load availability.');
  return (data ?? []) as Availability[];
}

export async function getBlackoutsForRange(
  providerId: string,
  from: string,
  to: string,
  accessToken?: string | null,
) {
  const insforge = getInsforge(accessToken);
  const { data, error } = await insforge.database
    .from('blackouts')
    .select('*')
    .eq('provider_id', providerId)
    .gte('end_at', from)
    .lte('start_at', to);

  assertNoDatabaseError(error, 'Unable to load blackouts.');
  return (data ?? []) as Blackout[];
}

export async function getBookedSlotsForRange(
  providerId: string,
  from: string,
  to: string,
  accessToken?: string | null,
) {
  const insforge = getInsforge(accessToken);
  const { data, error } = await insforge.database
    .from('bookings')
    .select('id, start_at, end_at, status')
    .eq('provider_id', providerId)
    .in('status', ['pending', 'confirmed'])
    .gte('start_at', from)
    .lte('start_at', to);

  assertNoDatabaseError(error, 'Unable to load booked slots.');
  return (data ?? []) as Pick<Booking, 'id' | 'start_at' | 'end_at' | 'status'>[];
}

export async function getViewerProviderProfile(accessToken: string, userId: string) {
  const insforge = getInsforge(accessToken);
  const { data, error } = await insforge.database
    .from('providers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  assertNoDatabaseError(error, 'Unable to load your provider profile.');
  return (data ?? null) as Provider | null;
}
