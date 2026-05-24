'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { upsertMyProfile } from '@/lib/profile-actions';
import type { Profile } from '@/lib/types';

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await upsertMyProfile({
      display_name: displayName,
      avatar_url: avatarUrl,
      phone,
      bio,
    });
    if (result.success) {
      toast.success('Profile saved.');
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="How others see you"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="avatarUrl">Avatar URL</label>
        <input
          id="avatarUrl"
          type="url"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="https://..."
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="phone">Phone</label>
        <input
          id="phone"
          type="tel"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Optional, only shared with providers you book"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="A short blurb for providers reviewing your request."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : 'Save profile'}
      </Button>
    </form>
  );
}
