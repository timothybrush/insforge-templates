export interface AuthViewer {
  isAuthenticated: boolean;
  id: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  created_at: string;
}

export interface Provider {
  id: string;
  user_id: string;
  slug: string;
  business_name: string;
  headline: string | null;
  description: string | null;
  location: string | null;
  timezone: string;
  cover_image_url: string | null;
  avatar_url: string | null;
  is_published: boolean;
  rating_average: number | null;
  rating_count: number;
  created_at: string;
  services?: Service[];
  reviews_summary?: { average: number; count: number };
}

export interface Service {
  id: string;
  provider_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  duration_min: number;
  price_cents: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  provider?: Pick<Provider, 'id' | 'slug' | 'business_name' | 'avatar_url' | 'timezone' | 'location'> | null;
}

export interface Availability {
  id: string;
  provider_id: string;
  day_of_week: number; // 0=Sunday … 6=Saturday
  start_time: string;  // 'HH:MM:SS'
  end_time: string;
}

export interface Blackout {
  id: string;
  provider_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'declined';

export interface Booking {
  id: string;
  service_id: string;
  provider_id: string;
  customer_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  customer_notes: string | null;
  provider_notes: string | null;
  total_cents: number;
  cancelled_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  service?: Pick<Service, 'id' | 'name' | 'duration_min' | 'image_url'> | null;
  provider?: Pick<Provider, 'id' | 'slug' | 'business_name' | 'avatar_url' | 'timezone'> | null;
  customer?: Pick<Profile, 'user_id' | 'display_name' | 'avatar_url'> | null;
}

export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: Pick<Profile, 'user_id' | 'display_name' | 'avatar_url'> | null;
}

export interface Review {
  id: string;
  booking_id: string;
  provider_id: string;
  customer_id: string;
  rating: number; // 1–5
  body: string | null;
  created_at: string;
  customer?: Pick<Profile, 'user_id' | 'display_name' | 'avatar_url'> | null;
}

export interface TimeSlot {
  /** ISO start time (UTC). */
  start: string;
  /** ISO end time (UTC). */
  end: string;
}
