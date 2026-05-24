'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { upsertMyProvider } from '@/lib/provider-actions';
import type { Provider } from '@/lib/types';

const TIMEZONE_HINTS = [
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'America/Denver',
  'Europe/London',
  'Europe/Lisbon',
  'Europe/Paris',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function ProviderProfileForm({ provider, mode }: { provider: Provider | null; mode: 'onboarding' | 'edit' }) {
  const [businessName, setBusinessName] = useState(provider?.business_name ?? '');
  const [slug, setSlug] = useState(provider?.slug ?? '');
  const [headline, setHeadline] = useState(provider?.headline ?? '');
  const [description, setDescription] = useState(provider?.description ?? '');
  const [location, setLocation] = useState(provider?.location ?? '');
  const [timezone, setTimezone] = useState(provider?.timezone ?? 'America/New_York');
  const [coverUrl, setCoverUrl] = useState(provider?.cover_image_url ?? '');
  const [avatarUrl, setAvatarUrl] = useState(provider?.avatar_url ?? '');
  const [isPublished, setIsPublished] = useState(provider?.is_published ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await upsertMyProvider({
      business_name: businessName,
      slug,
      headline,
      description,
      location,
      timezone,
      cover_image_url: coverUrl,
      avatar_url: avatarUrl,
      is_published: isPublished,
    });

    if (result.success) {
      toast.success(mode === 'onboarding' ? 'Provider page created.' : 'Profile saved.');
      if (mode === 'onboarding') {
        // Server reload picks up the new provider row.
        window.location.href = '/dashboard';
      }
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="businessName">Business name *</label>
          <input
            id="businessName"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="slug">Slug (URL)</label>
          <input
            id="slug"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="auto-generated from business name"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="headline">Headline</label>
        <input
          id="headline"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="One sentence on what you offer"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="description">Description</label>
        <textarea
          id="description"
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Longer story about your practice or studio."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="location">Location</label>
          <input
            id="location"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="City, State or City, Country"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="timezone">Timezone</label>
          <input
            id="timezone"
            list="timezone-options"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
          <datalist id="timezone-options">
            {TIMEZONE_HINTS.map((tz) => (
              <option key={tz} value={tz} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="cover">Cover image URL</label>
          <input
            id="cover"
            type="url"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="avatar">Avatar URL</label>
          <input
            id="avatar"
            type="url"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border-input"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        Publish to the marketplace
      </label>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : mode === 'onboarding' ? 'Create provider page' : 'Save profile'}
      </Button>
    </form>
  );
}
