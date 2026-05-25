import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createInsforgeServerClient } from '@/lib/insforge';

const PublicPageView = dynamic(
  () => import('@/components/editor/PublicPageView').then((m) => m.PublicPageView),
  { ssr: false },
);

export default async function SharedPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  // Anon client (no access token) — the RPC has SECURITY DEFINER and is granted to anon.
  const client = createInsforgeServerClient();

  const { data, error } = await client.database.rpc('get_shared_page', { p_share_token: shareToken });

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    notFound();
  }

  const page = Array.isArray(data) ? data[0] : data;

  return (
    <div className="min-h-dvh bg-background">
      <PublicPageView page={page} />
    </div>
  );
}
