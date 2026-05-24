-- InsForge Booking — schema, RLS, triggers, seed data
-- Multi-provider booking marketplace: customers browse providers, book services,
-- exchange messages, and leave reviews after completion.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key,
  display_name text,
  avatar_url text,
  bio text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  slug text not null unique,
  business_name text not null,
  headline text,
  description text,
  location text,
  timezone text not null default 'America/New_York',
  cover_image_url text,
  avatar_url text,
  is_published boolean not null default true,
  rating_average numeric(3, 2),
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint providers_business_name_not_blank check (btrim(business_name) <> ''),
  constraint providers_slug_not_blank check (btrim(slug) <> ''),
  constraint providers_unique_user unique (user_id),
  constraint providers_rating_range check (
    rating_average is null or (rating_average >= 0 and rating_average <= 5)
  ),
  constraint providers_rating_count_non_negative check (rating_count >= 0)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text not null,
  slug text not null,
  short_description text,
  description text,
  duration_min integer not null,
  price_cents integer not null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_name_not_blank check (btrim(name) <> ''),
  constraint services_duration_positive check (duration_min > 0 and duration_min <= 480),
  constraint services_price_non_negative check (price_cents >= 0),
  constraint services_unique_slug_per_provider unique (provider_id, slug)
);

create table if not exists public.availabilities (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint availabilities_day_range check (day_of_week between 0 and 6),
  constraint availabilities_time_order check (end_time > start_time),
  constraint availabilities_unique_slot unique (provider_id, day_of_week, start_time, end_time)
);

create table if not exists public.blackouts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint blackouts_range_order check (end_at > start_at)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete restrict,
  provider_id uuid not null references public.providers(id) on delete restrict,
  customer_id uuid not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pending',
  customer_notes text,
  provider_notes text,
  total_cents integer not null,
  cancelled_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_status_check check (
    status in ('pending', 'confirmed', 'completed', 'cancelled', 'declined')
  ),
  constraint bookings_range_order check (end_at > start_at),
  constraint bookings_total_non_negative check (total_cents >= 0)
);

create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint booking_messages_body_not_blank check (btrim(body) <> '')
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  customer_id uuid not null,
  rating smallint not null,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_unique_per_booking unique (booking_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists providers_published_idx
  on public.providers (is_published, created_at desc);
create index if not exists providers_user_idx
  on public.providers (user_id);

create index if not exists services_provider_active_idx
  on public.services (provider_id, is_active, created_at desc);

create index if not exists availabilities_provider_idx
  on public.availabilities (provider_id, day_of_week);

create index if not exists blackouts_provider_range_idx
  on public.blackouts (provider_id, start_at, end_at);

create index if not exists bookings_provider_start_idx
  on public.bookings (provider_id, start_at);
create index if not exists bookings_customer_start_idx
  on public.bookings (customer_id, start_at desc);
create index if not exists bookings_status_idx
  on public.bookings (status, start_at);
-- Prevent overlapping confirmed/pending bookings for the same provider start_at.
create unique index if not exists bookings_provider_slot_unique
  on public.bookings (provider_id, start_at)
  where status in ('pending', 'confirmed');

create index if not exists booking_messages_booking_idx
  on public.booking_messages (booking_id, created_at);

create index if not exists reviews_provider_created_idx
  on public.reviews (provider_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Trigger helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists providers_set_updated_at on public.providers;
create trigger providers_set_updated_at
  before update on public.providers
  for each row execute function public.set_updated_at();

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Maintain providers.rating_average and rating_count in response to reviews.
create or replace function public.refresh_provider_rating(p_provider_id uuid)
returns void
language plpgsql
as $$
declare
  v_avg numeric(3, 2);
  v_count integer;
begin
  select
    round(avg(rating)::numeric, 2),
    count(*)
  into v_avg, v_count
  from public.reviews
  where provider_id = p_provider_id;

  update public.providers
  set rating_average = v_avg,
      rating_count = coalesce(v_count, 0)
  where id = p_provider_id;
end;
$$;

create or replace function public.reviews_after_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_provider_rating(old.provider_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and new.provider_id is distinct from old.provider_id then
    perform public.refresh_provider_rating(old.provider_id);
  end if;

  perform public.refresh_provider_rating(new.provider_id);
  return new;
end;
$$;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_after_change();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.providers enable row level security;
alter table public.services enable row level security;
alter table public.availabilities enable row level security;
alter table public.blackouts enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_messages enable row level security;
alter table public.reviews enable row level security;

-- profiles: public read; self-write
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
  for select to anon, authenticated using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- providers: public reads for published rows; owner manages own row
drop policy if exists providers_select_published on public.providers;
create policy providers_select_published on public.providers
  for select to anon, authenticated using (is_published or user_id = auth.uid());

drop policy if exists providers_insert_self on public.providers;
create policy providers_insert_self on public.providers
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists providers_update_self on public.providers;
create policy providers_update_self on public.providers
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists providers_delete_self on public.providers;
create policy providers_delete_self on public.providers
  for delete to authenticated using (user_id = auth.uid());

-- services: public reads when provider is published; owner CRUD
drop policy if exists services_select_public on public.services;
create policy services_select_public on public.services
  for select to anon, authenticated using (
    exists (
      select 1 from public.providers p
      where p.id = services.provider_id
        and (p.is_published or p.user_id = auth.uid())
    )
  );

drop policy if exists services_insert_owner on public.services;
create policy services_insert_owner on public.services
  for insert to authenticated with check (
    exists (
      select 1 from public.providers p
      where p.id = services.provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists services_update_owner on public.services;
create policy services_update_owner on public.services
  for update to authenticated using (
    exists (
      select 1 from public.providers p
      where p.id = services.provider_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.providers p
      where p.id = services.provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists services_delete_owner on public.services;
create policy services_delete_owner on public.services
  for delete to authenticated using (
    exists (
      select 1 from public.providers p
      where p.id = services.provider_id and p.user_id = auth.uid()
    )
  );

-- availabilities: public reads (needed to compute open slots); owner CRUD
drop policy if exists availabilities_select_public on public.availabilities;
create policy availabilities_select_public on public.availabilities
  for select to anon, authenticated using (true);

drop policy if exists availabilities_insert_owner on public.availabilities;
create policy availabilities_insert_owner on public.availabilities
  for insert to authenticated with check (
    exists (
      select 1 from public.providers p
      where p.id = availabilities.provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists availabilities_update_owner on public.availabilities;
create policy availabilities_update_owner on public.availabilities
  for update to authenticated using (
    exists (
      select 1 from public.providers p
      where p.id = availabilities.provider_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.providers p
      where p.id = availabilities.provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists availabilities_delete_owner on public.availabilities;
create policy availabilities_delete_owner on public.availabilities
  for delete to authenticated using (
    exists (
      select 1 from public.providers p
      where p.id = availabilities.provider_id and p.user_id = auth.uid()
    )
  );

-- blackouts: same as availabilities
drop policy if exists blackouts_select_public on public.blackouts;
create policy blackouts_select_public on public.blackouts
  for select to anon, authenticated using (true);

drop policy if exists blackouts_insert_owner on public.blackouts;
create policy blackouts_insert_owner on public.blackouts
  for insert to authenticated with check (
    exists (
      select 1 from public.providers p
      where p.id = blackouts.provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists blackouts_update_owner on public.blackouts;
create policy blackouts_update_owner on public.blackouts
  for update to authenticated using (
    exists (
      select 1 from public.providers p
      where p.id = blackouts.provider_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.providers p
      where p.id = blackouts.provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists blackouts_delete_owner on public.blackouts;
create policy blackouts_delete_owner on public.blackouts
  for delete to authenticated using (
    exists (
      select 1 from public.providers p
      where p.id = blackouts.provider_id and p.user_id = auth.uid()
    )
  );

-- bookings: visible to customer or provider owner; insert by anyone authenticated
drop policy if exists bookings_select_participants on public.bookings;
create policy bookings_select_participants on public.bookings
  for select to authenticated using (
    customer_id = auth.uid()
    or exists (
      select 1 from public.providers p
      where p.id = bookings.provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists bookings_insert_customer on public.bookings;
create policy bookings_insert_customer on public.bookings
  for insert to authenticated with check (customer_id = auth.uid());

-- Update is open to either side; application logic constrains valid transitions.
drop policy if exists bookings_update_participants on public.bookings;
create policy bookings_update_participants on public.bookings
  for update to authenticated using (
    customer_id = auth.uid()
    or exists (
      select 1 from public.providers p
      where p.id = bookings.provider_id and p.user_id = auth.uid()
    )
  ) with check (
    customer_id = auth.uid()
    or exists (
      select 1 from public.providers p
      where p.id = bookings.provider_id and p.user_id = auth.uid()
    )
  );

-- booking_messages: participants only
drop policy if exists booking_messages_select_participants on public.booking_messages;
create policy booking_messages_select_participants on public.booking_messages
  for select to authenticated using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_messages.booking_id
        and (
          b.customer_id = auth.uid()
          or exists (
            select 1 from public.providers p
            where p.id = b.provider_id and p.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists booking_messages_insert_participants on public.booking_messages;
create policy booking_messages_insert_participants on public.booking_messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_messages.booking_id
        and (
          b.customer_id = auth.uid()
          or exists (
            select 1 from public.providers p
            where p.id = b.provider_id and p.user_id = auth.uid()
          )
        )
    )
  );

-- reviews: public reads; customer writes after the booking exists & is completed
drop policy if exists reviews_select_public on public.reviews;
create policy reviews_select_public on public.reviews
  for select to anon, authenticated using (true);

drop policy if exists reviews_insert_customer on public.reviews;
create policy reviews_insert_customer on public.reviews
  for insert to authenticated with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.customer_id = auth.uid()
        and b.provider_id = reviews.provider_id
        and b.status = 'completed'
    )
  );

drop policy if exists reviews_update_customer on public.reviews;
create policy reviews_update_customer on public.reviews
  for update to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists reviews_delete_customer on public.reviews;
create policy reviews_delete_customer on public.reviews
  for delete to authenticated using (customer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Demo seed data
--   Demo user_ids are namespaced under 11111111-…/22222222-…/33333333-… so they
--   never collide with real auth.users rows. RLS policies above filter rows by
--   auth.uid(), so demo data appears as "owned by someone else" once a real user
--   signs in — exactly the marketplace experience we want for a fresh demo.
-- ---------------------------------------------------------------------------

insert into public.profiles (user_id, display_name, avatar_url, bio, phone)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Aria Chen',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&q=80',
    'Certified yoga instructor & wellness coach helping busy professionals reconnect with their bodies.',
    null
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Marcus Bell',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&q=80',
    'Editorial portrait and event photographer based in Brooklyn.',
    null
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Sophia Mendes',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&q=80',
    'Pilates studio owner with 12 years of teaching across NYC and Lisbon.',
    null
  )
on conflict (user_id) do nothing;

insert into public.providers (
  id, user_id, slug, business_name, headline, description, location, timezone,
  cover_image_url, avatar_url, is_published
)
values
  (
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'aria-studio',
    'Aria Studio',
    'Personalized yoga & wellness coaching, in-studio or virtual.',
    'Aria Studio is a one-on-one wellness practice rooted in alignment-based vinyasa, restorative breathwork, and mindset coaching. We design every session around how you arrive that day — physically, mentally, and emotionally.',
    'Manhattan, NY',
    'America/New_York',
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1280&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&q=80',
    true
  ),
  (
    'bbbb2222-bbbb-2222-bbbb-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'northwind-photo',
    'Northwind Photography',
    'Editorial portraits & event coverage with a documentary touch.',
    'Northwind Photography captures the moments between the moments. Headshots, family sessions, weddings, and brand events — all shot in natural light when possible.',
    'Brooklyn, NY',
    'America/New_York',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1280&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&q=80',
    true
  ),
  (
    'cccc3333-cccc-3333-cccc-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'solstice-pilates',
    'Solstice Pilates',
    'Reformer pilates studio with semi-private and private classes.',
    'Solstice Pilates is an intimate, eight-reformer studio in Lisbon and NYC, focusing on rehabilitation, postnatal recovery, and athletic conditioning.',
    'Lisbon, PT',
    'Europe/Lisbon',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1280&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&q=80',
    true
  )
on conflict (id) do nothing;

insert into public.services (
  id, provider_id, name, slug, short_description, description,
  duration_min, price_cents, image_url, is_active
)
values
  -- Aria Studio
  (
    'a1110001-a111-a111-a111-aaaaaaaaaaaa',
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    'Private Vinyasa',
    'private-vinyasa',
    'A 60-minute alignment-based vinyasa flow tailored to your level.',
    'Start with a centering meditation, move through a custom sequence, and close with savasana. Mat and props provided in-studio.',
    60, 12000,
    'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800&q=80',
    true
  ),
  (
    'a1110002-a111-a111-a111-aaaaaaaaaaaa',
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    'Restorative + Breathwork',
    'restorative-breathwork',
    'A 75-minute deeply relaxing session built around breath and stillness.',
    'Long-held supported postures, guided pranayama, and a yoga nidra closing. Ideal for stress relief and sleep support.',
    75, 14000,
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    true
  ),
  (
    'a1110003-a111-a111-a111-aaaaaaaaaaaa',
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    'Wellness Coaching Call',
    'wellness-coaching',
    'A 45-minute video call to map out goals, habits, and rituals.',
    'Use this conversation to design a sustainable wellness practice. Follow-up notes and a 7-day plan included.',
    45, 9000,
    'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=800&q=80',
    true
  ),
  -- Northwind Photography
  (
    'b2220001-b222-b222-b222-bbbbbbbbbbbb',
    'bbbb2222-bbbb-2222-bbbb-222222222222',
    'Headshot Session',
    'headshot-session',
    'A 30-minute studio or outdoor headshot session, two looks.',
    'You will receive 8 edited high-resolution photos and a contact sheet of all selects within 5 business days.',
    30, 25000,
    'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=800&q=80',
    true
  ),
  (
    'b2220002-b222-b222-b222-bbbbbbbbbbbb',
    'bbbb2222-bbbb-2222-bbbb-222222222222',
    'Family Portrait',
    'family-portrait',
    'A 60-minute on-location family session, up to 6 people.',
    'Outdoor portraits at a park, beach, or location of your choosing. Includes 25 edited photos delivered via a private gallery.',
    60, 48000,
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80',
    true
  ),
  (
    'b2220003-b222-b222-b222-bbbbbbbbbbbb',
    'bbbb2222-bbbb-2222-bbbb-222222222222',
    'Brand Event Coverage',
    'brand-event-coverage',
    'A 120-minute event shoot with same-day social-ready edits.',
    'Press events, product launches, dinners. Includes 5 social-ready edits delivered within 6 hours and 60 full edits within 5 days.',
    120, 95000,
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
    true
  ),
  -- Solstice Pilates
  (
    'c3330001-c333-c333-c333-cccccccccccc',
    'cccc3333-cccc-3333-cccc-333333333333',
    'Private Reformer',
    'private-reformer',
    'A 50-minute one-on-one reformer session.',
    'Full body conditioning on the reformer, scaled to your level and goals. Best for first-timers and athletes alike.',
    50, 11000,
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
    true
  ),
  (
    'c3330002-c333-c333-c333-cccccccccccc',
    'cccc3333-cccc-3333-cccc-333333333333',
    'Semi-Private (2 ppl)',
    'semi-private-pilates',
    'A 50-minute semi-private class for two people.',
    'Bring a friend or partner. Pricing is per session, not per person. Reformers, mat, and props included.',
    50, 16000,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    true
  ),
  (
    'c3330003-c333-c333-c333-cccccccccccc',
    'cccc3333-cccc-3333-cccc-333333333333',
    'Postnatal Recovery',
    'postnatal-recovery',
    'A 60-minute pelvic floor & core rebuilding session.',
    'Designed for the first 12 months after birth. Diastasis-safe sequences and breath patterning. Cleared by your OB required.',
    60, 13500,
    'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&q=80',
    true
  )
on conflict (id) do nothing;

-- Availability: weekly recurring slots in each provider's local timezone.
insert into public.availabilities (provider_id, day_of_week, start_time, end_time)
values
  -- Aria Studio: Mon–Fri 9am-6pm, Sat 10am-2pm
  ('aaaa1111-aaaa-1111-aaaa-111111111111', 1, '09:00', '18:00'),
  ('aaaa1111-aaaa-1111-aaaa-111111111111', 2, '09:00', '18:00'),
  ('aaaa1111-aaaa-1111-aaaa-111111111111', 3, '09:00', '18:00'),
  ('aaaa1111-aaaa-1111-aaaa-111111111111', 4, '09:00', '18:00'),
  ('aaaa1111-aaaa-1111-aaaa-111111111111', 5, '09:00', '18:00'),
  ('aaaa1111-aaaa-1111-aaaa-111111111111', 6, '10:00', '14:00'),
  -- Northwind: Tue–Sat 10am-7pm
  ('bbbb2222-bbbb-2222-bbbb-222222222222', 2, '10:00', '19:00'),
  ('bbbb2222-bbbb-2222-bbbb-222222222222', 3, '10:00', '19:00'),
  ('bbbb2222-bbbb-2222-bbbb-222222222222', 4, '10:00', '19:00'),
  ('bbbb2222-bbbb-2222-bbbb-222222222222', 5, '10:00', '19:00'),
  ('bbbb2222-bbbb-2222-bbbb-222222222222', 6, '10:00', '19:00'),
  -- Solstice Pilates: Mon–Sat with a midday split
  ('cccc3333-cccc-3333-cccc-333333333333', 1, '07:00', '12:00'),
  ('cccc3333-cccc-3333-cccc-333333333333', 1, '15:00', '20:00'),
  ('cccc3333-cccc-3333-cccc-333333333333', 2, '07:00', '12:00'),
  ('cccc3333-cccc-3333-cccc-333333333333', 2, '15:00', '20:00'),
  ('cccc3333-cccc-3333-cccc-333333333333', 3, '07:00', '12:00'),
  ('cccc3333-cccc-3333-cccc-333333333333', 3, '15:00', '20:00'),
  ('cccc3333-cccc-3333-cccc-333333333333', 4, '07:00', '12:00'),
  ('cccc3333-cccc-3333-cccc-333333333333', 4, '15:00', '20:00'),
  ('cccc3333-cccc-3333-cccc-333333333333', 5, '07:00', '12:00'),
  ('cccc3333-cccc-3333-cccc-333333333333', 6, '08:00', '13:00')
on conflict do nothing;

-- A couple of demo bookings — including one completed booking that will carry a review.
insert into public.bookings (
  id, service_id, provider_id, customer_id, start_at, end_at,
  status, customer_notes, total_cents
)
values
  (
    'd4440001-d444-d444-d444-dddddddddddd',
    'a1110001-a111-a111-a111-aaaaaaaaaaaa',
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    '44444444-4444-4444-4444-444444444444',
    now() - interval '14 days' + interval '11 hours',
    now() - interval '14 days' + interval '12 hours',
    'completed',
    'First-time student, recovering from a shoulder injury.',
    12000
  ),
  (
    'd4440002-d444-d444-d444-dddddddddddd',
    'b2220001-b222-b222-b222-bbbbbbbbbbbb',
    'bbbb2222-bbbb-2222-bbbb-222222222222',
    '55555555-5555-5555-5555-555555555555',
    now() + interval '3 days' + interval '15 hours',
    now() + interval '3 days' + interval '15 hours 30 minutes',
    'confirmed',
    'Need updated LinkedIn headshots.',
    25000
  ),
  (
    'd4440003-d444-d444-d444-dddddddddddd',
    'c3330001-c333-c333-c333-cccccccccccc',
    'cccc3333-cccc-3333-cccc-333333333333',
    '66666666-6666-6666-6666-666666666666',
    now() + interval '1 day' + interval '8 hours',
    now() + interval '1 day' + interval '8 hours 50 minutes',
    'pending',
    null,
    11000
  )
on conflict (id) do nothing;

insert into public.reviews (booking_id, provider_id, customer_id, rating, body)
values
  (
    'd4440001-d444-d444-d444-dddddddddddd',
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    '44444444-4444-4444-4444-444444444444',
    5,
    'Aria adapted every pose around my shoulder mobility and I left feeling lighter than I have in weeks. Already booked my next session.'
  )
on conflict (booking_id) do nothing;

-- Refresh cached rating stats once seed reviews are in place.
select public.refresh_provider_rating('aaaa1111-aaaa-1111-aaaa-111111111111');
select public.refresh_provider_rating('bbbb2222-bbbb-2222-bbbb-222222222222');
select public.refresh_provider_rating('cccc3333-cccc-3333-cccc-333333333333');
