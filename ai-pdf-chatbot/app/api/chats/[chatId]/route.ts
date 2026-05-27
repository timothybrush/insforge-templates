import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createInsforgeServerClient } from '@/lib/insforge';
import { getCurrentAuthState } from '@/lib/auth-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const auth = await getCurrentAuthState();
  if (!auth.viewer.isAuthenticated || !auth.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const client = createInsforgeServerClient({ accessToken: auth.accessToken });

  const chatRes = await client.database
    .from('chat_sessions')
    .select('*')
    .eq('id', chatId)
    .single();

  if (chatRes.error || !chatRes.data) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const msgRes = await client.database
    .from('chat_messages')
    .select('id, role, content, sort_order, citations, created_at')
    .eq('chat_id', chatId)
    .order('sort_order', { ascending: true });

  if (msgRes.error) return NextResponse.json({ error: msgRes.error.message }, { status: 500 });

  return NextResponse.json({ chat: chatRes.data, messages: msgRes.data ?? [] });
}

// PATCH supports two independent operations (one per request):
//   { title: "..." }            → rename
//   { share_enabled: true|false } → mint a new share_token / clear it
export async function PATCH(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const auth = await getCurrentAuthState();
  if (!auth.viewer.isAuthenticated || !auth.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    share_enabled?: boolean;
  };

  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string') {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (title.length > 200) return NextResponse.json({ error: 'Title too long' }, { status: 400 });
    patch.title = title;
  }
  if (typeof body.share_enabled === 'boolean') {
    patch.share_token = body.share_enabled ? randomBytes(16).toString('base64url') : null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const client = createInsforgeServerClient({ accessToken: auth.accessToken });
  const { data, error } = await client.database
    .from('chat_sessions')
    .update(patch)
    .eq('id', chatId)
    .select('id, title, document_ids, share_token, created_at, last_message_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ chat: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const auth = await getCurrentAuthState();
  if (!auth.viewer.isAuthenticated || !auth.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const client = createInsforgeServerClient({ accessToken: auth.accessToken });

  const del = await client.database.from('chat_sessions').delete().eq('id', chatId);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
