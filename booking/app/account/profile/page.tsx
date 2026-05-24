import { ProfileForm } from '@/components/profile-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getMyProfile } from '@/lib/account-bookings';
import {
  persistRefreshedSession,
  requireAuthenticatedSession,
} from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await requireAuthenticatedSession();
  await persistRefreshedSession(session);

  const profile = await getMyProfile(session.accessToken, session.viewer.id);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-shell max-w-3xl space-y-8 py-12">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Customer dashboard</p>
          <h1 className="font-display text-5xl">Profile</h1>
          <p className="text-muted-foreground">
            This is how providers see you when they review a booking. Your email stays private
            until a booking is confirmed.
          </p>
        </header>

        <section className="glass-panel p-6 sm:p-8">
          <ProfileForm profile={profile} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
