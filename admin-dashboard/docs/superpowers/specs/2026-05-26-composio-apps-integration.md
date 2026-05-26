# Composio Integration for Apps Page — Design Spec

**Date:** 2026-05-26
**Template:** `admin-dashboard`
**Author:** InsForge

## 1. Goal

Replace the stub toggle in `src/features/apps/use-toggle-app.ts` with real per-workspace OAuth flows for 7 SaaS integrations, brokered by [Composio](https://composio.dev) Connected Accounts. After this change, clicking "Connect" on a Slack/Notion/GitHub/Discord/Figma/Linear/Vercel card will:

1. Open the provider's real OAuth consent screen (hosted by Composio).
2. Persist the resulting Composio `connected_account_id` into `app_connections.config_json`.
3. Show the connected account label ("Connected as `@alice`") and a Disconnect button on the card.

Stripe and OpenRouter remain InsForge-native (their cards deep-link to the OSS dashboard's existing settings pages). The `zapier` card is removed — it overlaps semantically with Composio itself.

## 2. Scope

### In scope

| Service | Integration |
|---------|-------------|
| GitHub | Composio (`github`) |
| Notion | Composio (`notion`) |
| Slack | Composio (`slack`) |
| Discord | Composio (`discord`) |
| Figma | Composio (`figma`) |
| Linear | Composio (`linear`) |
| Vercel | Composio (`vercel`) |
| Stripe | InsForge-native — deep link to OSS dashboard `/payments` |
| OpenRouter | InsForge-native — deep link to OSS dashboard `/ai` |

### Out of scope

- **Zapier card** — removed from the seed list.
- **Acting on the connection** (posting to Slack, creating Notion pages, etc.) — this spec only covers connection management. A follow-up template iteration can add an "Automations" page that wires Composio actions to InsForge realtime triggers.
- **Per-user (end-user) connections** — connections are scoped to the workspace (admin connects once, all workspace members share the connection).

## 3. Architecture

### Why Composio

Each of the 7 SaaS apps has its own OAuth dance, scopes, refresh-token policy, and API surface. Doing them individually means 7 × (OAuth client registration + token storage + refresh logic + API client). Composio handles all of that and exposes a unified Connected Accounts model: one API to initiate auth, one API to list/revoke connections, one API to execute actions.

### Flow

```
[User]                  [SPA]                   [InsForge edge fn]              [Composio]
  |                       |                            |                            |
  | click "Connect Slack" |                            |                            |
  |---------------------->|                            |                            |
  |                       | POST /apps/slack/connect   |                            |
  |                       |--------------------------->|                            |
  |                       |                            | initiateConnectedAccount() |
  |                       |                            |--------------------------->|
  |                       |                            |   { redirectUrl, id }      |
  |                       |                            |<---------------------------|
  |                       | { redirectUrl, request_id }|                            |
  |                       |<---------------------------|                            |
  |                       |                            |                            |
  | popup -> Slack OAuth  |                            |                            |
  |---------------------------------------------------------------------------------|
  |                       |                            |                            |
  | Slack callback -> Composio callback URL            |                            |
  |---------------------------------------------------------------------------------|
  |                       |                            |                            |
  |                       | poll: GET /apps/slack      |                            |
  |                       |       /poll?request_id=... |                            |
  |                       |--------------------------->|                            |
  |                       |                            | getConnectedAccount(req_id)|
  |                       |                            |--------------------------->|
  |                       |                            |  { status: ACTIVE, ... }   |
  |                       |                            |<---------------------------|
  |                       |                            | upsert app_connections     |
  |                       |                            |   .config_json with        |
  |                       |                            |   { connected_account_id,  |
  |                       |                            |     account_label }        |
  |                       |  { connected: true, label }|                            |
  |                       |<---------------------------|                            |
  | card re-renders       |                            |                            |
```

Composio's OAuth callback goes to `https://backend.composio.dev/api/v3/...` — **not** the template's domain. So we do not need to add any callback URLs to `insforge.toml`'s `allowed_redirect_urls`. The SPA polls our edge function (which polls Composio) until the connection becomes `ACTIVE` or times out.

## 4. Data Model Changes

All additive — no destructive migration.

### `apps_catalog` — add `integration_kind` column

```sql
alter table public.apps_catalog
  add column if not exists integration_kind text not null default 'composio'
    check (integration_kind in ('composio', 'insforge_native'));

alter table public.apps_catalog
  add column if not exists composio_toolkit_slug text;
```

- `integration_kind` — drives client-side branching (Composio OAuth vs deep link).
- `composio_toolkit_slug` — Composio's toolkit identifier (e.g. `slack`, `github`). Usually matches our `slug`; kept separate so we can rename our slug without breaking Composio mapping.

### `apps_catalog` — re-seed

```sql
-- Replace the existing single INSERT block (db_init.sql:610-621) with this.
insert into public.apps_catalog (slug, name, description, icon_url, integration_kind, composio_toolkit_slug, display_order) values
  ('stripe',     'Stripe',     'Accept payments, manage subscriptions, and view revenue.',     'https://cdn.simpleicons.org/stripe',     'insforge_native', null,      1),
  ('openrouter', 'OpenRouter', 'Unified API for 100+ AI models, with usage analytics.',         'https://cdn.simpleicons.org/openrouter', 'insforge_native', null,      2),
  ('github',     'GitHub',     'Sync issues, manage releases, and trigger workflows.',          'https://cdn.simpleicons.org/github',     'composio',        'github',  3),
  ('notion',     'Notion',     'Embed docs, capture notes, and link knowledge bases.',          'https://cdn.simpleicons.org/notion',     'composio',        'notion',  4),
  ('slack',      'Slack',      'Get notifications and respond to events without leaving Slack.','https://cdn.simpleicons.org/slack',      'composio',        'slack',   5),
  ('discord',    'Discord',    'Bridge community channels into your workspace.',                'https://cdn.simpleicons.org/discord',    'composio',        'discord', 6),
  ('figma',      'Figma',      'Link design files and surface comments inline.',                'https://cdn.simpleicons.org/figma',      'composio',        'figma',   7),
  ('linear',     'Linear',     'Track issues, ship faster, and keep tasks in sync.',            'https://cdn.simpleicons.org/linear',     'composio',        'linear',  8),
  ('vercel',     'Vercel',     'Tail deployments and surface preview URLs.',                    'https://cdn.simpleicons.org/vercel',     'composio',        'vercel',  9)
on conflict (slug) do update set
  integration_kind = excluded.integration_kind,
  composio_toolkit_slug = excluded.composio_toolkit_slug;

-- Drop Zapier from any existing dev database.
delete from public.apps_catalog where slug = 'zapier';
```

The pre-existing `oauth_provider` column on `apps_catalog` becomes dead — leave it for now to avoid a destructive migration; the next major schema rev can drop it.

### `app_connections.config_json` shape (no DDL change)

The column is already `jsonb not null default '{}'::jsonb`. Composio-backed connections will store:

```json
{
  "kind": "composio",
  "connected_account_id": "ca_AbC123...",
  "account_label": "@alice in acme-eng",
  "connected_at_provider": "2026-05-26T14:22:10Z"
}
```

InsForge-native connections continue to leave `config_json` empty `{}` — we just key off the row's existence + `apps_catalog.integration_kind = 'insforge_native'` to know what to render.

## 5. Backend — InsForge Edge Functions

Two new functions, deployed via `npx @insforge/cli functions deploy`. The template root will gain a `functions/` directory mirroring the [chatbot template's pattern](../../../chatbot/functions/).

### `functions/apps-connect/index.ts`

```typescript
// POST /apps-connect
// Body: { app_slug: string, workspace_id: string }
// Returns: { redirect_url: string, request_id: string }

import { ComposioClient } from '@composio/core'
import { getRequestingUser, getWorkspaceMembership, json, err } from './_shared.ts'

const composio = new ComposioClient({ apiKey: Deno.env.get('COMPOSIO_API_KEY')! })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return err(405, 'method_not_allowed')

  const user = await getRequestingUser(req)
  if (!user) return err(401, 'unauthorized')

  const { app_slug, workspace_id } = await req.json()
  if (!app_slug || !workspace_id) return err(400, 'missing_fields')

  const member = await getWorkspaceMembership(user.id, workspace_id)
  if (!member) return err(403, 'not_a_workspace_member')

  // Look up the toolkit slug from apps_catalog.
  const { data: appRow } = await member.db
    .from('apps_catalog')
    .select('integration_kind, composio_toolkit_slug')
    .eq('slug', app_slug)
    .single()

  if (appRow?.integration_kind !== 'composio' || !appRow.composio_toolkit_slug) {
    return err(400, 'not_a_composio_app')
  }

  // Composio Connected Accounts: initiate.
  // The auth_config_id is shared per toolkit, registered once in Composio dashboard
  // and stored in env as COMPOSIO_AUTH_CONFIG_<UPPER_SLUG>.
  const authConfigId = Deno.env.get(
    `COMPOSIO_AUTH_CONFIG_${appRow.composio_toolkit_slug.toUpperCase()}`,
  )
  if (!authConfigId) return err(500, 'auth_config_not_provisioned')

  const init = await composio.connectedAccounts.initiate({
    userId: workspace_id, // <-- one Composio "user" per InsForge workspace
    authConfigId,
  })

  return json({
    redirect_url: init.redirectUrl,
    request_id: init.id,
  })
}
```

### `functions/apps-poll/index.ts`

```typescript
// GET /apps-poll?request_id=...&app_slug=...&workspace_id=...
// Returns: { status: 'pending' | 'connected' | 'failed', account_label?: string }

import { ComposioClient } from '@composio/core'
import { getRequestingUser, getWorkspaceMembership, json, err } from './_shared.ts'

const composio = new ComposioClient({ apiKey: Deno.env.get('COMPOSIO_API_KEY')! })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return err(405, 'method_not_allowed')

  const user = await getRequestingUser(req)
  if (!user) return err(401, 'unauthorized')

  const url = new URL(req.url)
  const request_id = url.searchParams.get('request_id')
  const app_slug = url.searchParams.get('app_slug')
  const workspace_id = url.searchParams.get('workspace_id')
  if (!request_id || !app_slug || !workspace_id) return err(400, 'missing_fields')

  const member = await getWorkspaceMembership(user.id, workspace_id)
  if (!member) return err(403, 'not_a_workspace_member')

  const account = await composio.connectedAccounts.get(request_id)

  if (account.status === 'INITIATED') {
    return json({ status: 'pending' })
  }
  if (account.status !== 'ACTIVE') {
    return json({ status: 'failed' })
  }

  // Persist with the user's RLS context so the insert passes
  // app_connections_insert_member.
  const { error } = await member.db
    .from('app_connections')
    .upsert(
      {
        workspace_id,
        app_slug,
        status: 'connected',
        connected_by: user.id,
        connected_at: new Date().toISOString(),
        config_json: {
          kind: 'composio',
          connected_account_id: account.id,
          account_label: account.data?.account_label ?? account.data?.user_email ?? null,
          connected_at_provider: account.createdAt,
        },
      },
      { onConflict: 'workspace_id,app_slug' },
    )
  if (error) return err(500, error.message)

  return json({
    status: 'connected',
    account_label: account.data?.account_label ?? null,
  })
}
```

### `functions/apps-disconnect/index.ts`

```typescript
// POST /apps-disconnect
// Body: { app_slug: string, workspace_id: string }
// Returns: { ok: true }

import { ComposioClient } from '@composio/core'
import { getRequestingUser, getWorkspaceMembership, json, err } from './_shared.ts'

const composio = new ComposioClient({ apiKey: Deno.env.get('COMPOSIO_API_KEY')! })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return err(405, 'method_not_allowed')

  const user = await getRequestingUser(req)
  if (!user) return err(401, 'unauthorized')

  const { app_slug, workspace_id } = await req.json()
  if (!app_slug || !workspace_id) return err(400, 'missing_fields')

  const member = await getWorkspaceMembership(user.id, workspace_id)
  if (!member) return err(403, 'not_a_workspace_member')

  // Look up the existing connection to get the Composio account id.
  const { data: existing } = await member.db
    .from('app_connections')
    .select('config_json')
    .eq('workspace_id', workspace_id)
    .eq('app_slug', app_slug)
    .single()

  const composioId = existing?.config_json?.connected_account_id
  if (composioId) {
    await composio.connectedAccounts.delete(composioId).catch(() => {
      // Best-effort: if Composio 404s the connection is already gone.
    })
  }

  const { error } = await member.db
    .from('app_connections')
    .delete()
    .eq('workspace_id', workspace_id)
    .eq('app_slug', app_slug)
  if (error) return err(500, error.message)

  return json({ ok: true })
}
```

### `functions/_shared.ts`

Small helpers — `getRequestingUser` (verifies the InsForge JWT from `Authorization: Bearer`), `getWorkspaceMembership` (returns `{ db: insforgeServerClient }` scoped to that user, or `null` if not a member), and JSON response shorthands. Mirror the chatbot template's `functions/_shared.ts`.

## 6. Frontend Changes

### `src/features/apps/use-apps.ts` — surface `integration_kind` and `account_label`

Extend the row shape so the UI can branch:

```typescript
export type AppWithConnection = {
  slug: string
  name: string
  description: string
  icon_url: string | null
  display_order: number
  integration_kind: 'composio' | 'insforge_native'
  oss_dashboard_path: string | null // for insforge_native deep link
  connected: boolean
  account_label: string | null
}
```

Update the catalog select to pull `integration_kind` and `composio_toolkit_slug`, and the connection select to pull `config_json`. Compute `oss_dashboard_path` client-side from a hard map:

```typescript
const OSS_DEEP_LINKS: Record<string, string> = {
  stripe: '/payments',
  openrouter: '/ai',
}
```

(The OSS dashboard origin is read from `import.meta.env.VITE_INSFORGE_OSS_URL`.)

### `src/features/apps/use-toggle-app.ts` — replace stub with branched flow

Becomes a thin router that dispatches to one of three handlers:

```typescript
export function useConnectApp(workspaceId: string | undefined) {
  // Branches on app.integration_kind:
  //   - composio: POST /apps-connect, open popup to redirect_url, poll until ACTIVE
  //   - insforge_native: window.open(`${OSS_URL}${oss_dashboard_path}`, '_blank')
}

export function useDisconnectApp(workspaceId: string | undefined) {
  // POST /apps-disconnect
}
```

Composio connect flow on the client:

```typescript
async function connectComposio(app: AppWithConnection, workspaceId: string) {
  const { redirect_url, request_id } = await callFunction('apps-connect', {
    app_slug: app.slug,
    workspace_id: workspaceId,
  })

  const popup = window.open(redirect_url, 'composio-oauth', 'width=600,height=720')
  if (!popup) throw new Error('Popup blocked')

  // Poll every 1.5s for up to 2 minutes.
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    if (popup.closed) {
      // user closed without finishing — do a final poll to be sure
    }
    await sleep(1500)
    const r = await callFunction('apps-poll', {
      request_id, app_slug: app.slug, workspace_id: workspaceId,
    }, { method: 'GET' })
    if (r.status === 'connected') {
      popup.close()
      return r
    }
    if (r.status === 'failed') {
      popup.close()
      throw new Error('Authorization failed')
    }
  }
  popup.close()
  throw new Error('Authorization timed out')
}
```

### `src/features/apps/apps-grid.tsx` — replace Switch with kind-aware control

The current `<Switch>` is the wrong affordance for OAuth-backed connections (you cannot meaningfully "toggle" an OAuth grant atomically). Replace with:

| Card state | Composio app | InsForge-native app |
|------------|--------------|---------------------|
| not connected | `<Button>Connect</Button>` → opens popup | `<Button variant="outline">Configure in dashboard</Button>` → opens OSS link in new tab |
| pending | `<Button disabled>Connecting…</Button>` with spinner | n/a |
| connected | `<Badge>Connected as {account_label}</Badge>` + `<Button variant="ghost">Disconnect</Button>` | `<Badge>Configured</Badge>` + the same dashboard link |

Drop the `Switch` import.

## 7. One-Time Composio Dashboard Setup

For each of the 7 toolkits, the template author needs to do this **once** in the Composio dashboard (https://app.composio.dev) and capture the resulting `auth_config_id`:

1. Go to **Toolkits** → pick e.g. **Slack**.
2. Click **Create Auth Config**.
3. Choose **OAuth 2.0** (Composio handles the OAuth client registration with the provider in dev mode; for production each toolkit needs its own provider-side OAuth app, configured per the Composio docs page for that toolkit).
4. Copy the `auth_config_id` (looks like `ac_AbC123…`).

The resulting 7 IDs go into the project's secrets:

```bash
npx @insforge/cli secrets set COMPOSIO_API_KEY '<api-key-from-composio-settings>'
npx @insforge/cli secrets set COMPOSIO_AUTH_CONFIG_GITHUB  'ac_...'
npx @insforge/cli secrets set COMPOSIO_AUTH_CONFIG_NOTION  'ac_...'
npx @insforge/cli secrets set COMPOSIO_AUTH_CONFIG_SLACK   'ac_...'
npx @insforge/cli secrets set COMPOSIO_AUTH_CONFIG_DISCORD 'ac_...'
npx @insforge/cli secrets set COMPOSIO_AUTH_CONFIG_FIGMA   'ac_...'
npx @insforge/cli secrets set COMPOSIO_AUTH_CONFIG_LINEAR  'ac_...'
npx @insforge/cli secrets set COMPOSIO_AUTH_CONFIG_VERCEL  'ac_...'
```

The README's "Wire a real integration" section will be rewritten as a checklist pointing at this setup. A `npm run setup:composio` script can echo the above with the project's actual secret names for convenience.

## 8. Environment Variables

| Var | Where | Purpose |
|-----|-------|---------|
| `COMPOSIO_API_KEY` | InsForge secrets (edge fns) | Composio SDK auth |
| `COMPOSIO_AUTH_CONFIG_<TOOLKIT>` × 7 | InsForge secrets (edge fns) | per-toolkit auth config id |
| `VITE_INSFORGE_OSS_URL` | `.env.local` (SPA) | OSS dashboard origin for native deep links; defaults to `https://app.insforge.dev` |

## 9. Open Questions / Gotchas

1. **Workspace-as-Composio-user.** We pass `userId: workspace_id` to Composio. This means the Composio dashboard's "user" axis = our workspace axis, which is what we want (workspace-scoped connections, not per-end-user). If a future iteration wants per-end-user connections, switch to `userId: user.id`.

2. **Composio rate limits on poll.** Composio's free tier limits API calls. The 1.5 s polling interval = ~80 calls per 2-minute OAuth window per pending connection — fine for one at a time, but if we ever support bulk-connect, switch to webhooks (Composio supports `connection.activated` webhooks).

3. **Popup blockers.** Modern browsers block popups not opened in a direct user-gesture handler. Confirm the popup opens synchronously inside the button's `onClick`, before the `await callFunction('apps-connect', ...)` resolves — otherwise it gets blocked. The actual `redirect_url` is then assigned to `popup.location` once the fetch returns.

4. **Stripe/OpenRouter deep links assume the user is in cloud, not OSS-only.** A user running this template against a self-hosted InsForge OSS instance will have a different dashboard URL. The `VITE_INSFORGE_OSS_URL` env var covers this; the README needs to call it out.

5. **No Composio CLI dependency at runtime.** The skill `composio-cli` is for human operators; the template uses the Composio JavaScript SDK (`@composio/core`) directly inside edge functions.

## 10. Demo Path (verification at the end)

1. `cd admin-dashboard && npm install && npm run setup`
2. Set secrets per §7.
3. `npx @insforge/cli functions deploy`
4. `npm run dev`, sign in, create a workspace.
5. Go to `/apps`, click **Connect** on the Slack card.
6. Popup opens to Slack OAuth → authorize → popup closes.
7. Card now shows **Connected as `@alice in acme-eng`** with a Disconnect button.
8. Refresh — state persists.
9. Click **Disconnect** — card returns to **Connect** state, and the connection is gone from the Composio dashboard.

If all 9 steps pass for Slack, repeat for one more (e.g. GitHub) to confirm the toolkit-agnostic code path.
