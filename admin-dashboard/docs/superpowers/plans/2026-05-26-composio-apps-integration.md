# Composio Apps Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub toggle on the admin-dashboard `/apps` page with real OAuth-backed connection flows for 7 SaaS integrations (GitHub, Notion, Slack, Discord, Figma, Linear, Vercel) brokered by Composio Connected Accounts. Stripe + OpenRouter become deep-links to the OSS dashboard. Zapier is removed.

**Architecture:** Three InsForge edge functions (`apps-connect`, `apps-poll`, `apps-disconnect`) wrap Composio's REST API and write the Composio `connected_account_id` into `app_connections.config_json` using the caller's RLS context. The SPA opens a popup to Composio's hosted OAuth URL and polls the `apps-poll` function until `ACTIVE`. Stripe/OpenRouter cards branch to a `window.open(VITE_INSFORGE_OSS_URL + path)` flow with no DB row.

**Tech Stack:** Vite + React 19 + TanStack Query + TanStack Router; `@insforge/sdk` for the SPA; Deno Subhosting (`npm:@insforge/sdk`) + Composio REST API for the edge functions.

**Verification gate:** This template has no test framework (matching other InsForge templates), so each implementation task ends with `npm run typecheck` + `npm run lint` rather than unit tests. A final smoke-test task (Task 10) drives the end-to-end flow in a browser.

**Reference spec:** `../specs/2026-05-26-composio-apps-integration.md`. The plan deliberately diverges from the spec in two places (called out where they occur):

- **No `_shared.ts` for functions.** InsForge functions deploy one file at a time and don't share modules. CORS + auth helpers inline in each function.
- **No `app_connections` rows for `insforge_native` apps.** The Stripe/OpenRouter cards are static deep-links; their "connected" state is never persisted (the OSS dashboard owns that state). Only Composio apps write to `app_connections`.

---

## File Map

**Create:**
- `admin-dashboard/migrations/<timestamp>_composio-apps-integration.sql` — schema additions + re-seed
- `admin-dashboard/functions/apps-connect.ts` — initiate Composio Connected Account
- `admin-dashboard/functions/apps-poll.ts` — poll status, on ACTIVE upsert to `app_connections`
- `admin-dashboard/functions/apps-disconnect.ts` — revoke Composio + delete row
- `admin-dashboard/src/features/apps/use-connect-app.ts` — Composio popup flow + deep-link branch
- `admin-dashboard/src/features/apps/use-disconnect-app.ts` — Composio revoke

**Modify:**
- `admin-dashboard/src/features/apps/use-apps.ts` — surface `integration_kind`, `account_label`, `oss_dashboard_path`
- `admin-dashboard/src/features/apps/apps-grid.tsx` — replace `<Switch>` with kind-aware buttons
- `admin-dashboard/src/features/apps/apps-page.tsx` — wire to `useConnectApp` / `useDisconnectApp`
- `admin-dashboard/README.md` — replace "Wire a real integration" section with Composio setup checklist
- `admin-dashboard/.env.example` — add `VITE_INSFORGE_OSS_URL`

**Delete:**
- `admin-dashboard/src/features/apps/use-toggle-app.ts` (replaced by the two new hooks)

---

## Task 1: Migration — schema + re-seed

**Files:**
- Create: `admin-dashboard/migrations/<run `db migrations new` to pick timestamp>_composio-apps-integration.sql`

- [ ] **Step 1: Generate the migration file with the InsForge CLI**

The CLI enforces `<timestamp>_<hyphen-name>.sql` and rejects other formats. Run from `admin-dashboard/`:

```bash
cd admin-dashboard
npx @insforge/cli db migrations new composio-apps-integration
```

This prints the created path (e.g. `migrations/20260526143000_composio-apps-integration.sql`). Note the actual filename — subsequent steps refer to it as `<MIGRATION_FILE>`.

- [ ] **Step 2: Write the migration body**

Replace the empty file contents with exactly:

```sql
-- Composio Apps integration: catalog metadata + re-seed (no Zapier).
-- See docs/superpowers/specs/2026-05-26-composio-apps-integration.md

alter table public.apps_catalog
  add column if not exists integration_kind text not null default 'composio'
    check (integration_kind in ('composio', 'insforge_native'));

alter table public.apps_catalog
  add column if not exists composio_toolkit_slug text;

-- Re-seed: Zapier removed, integration_kind + composio_toolkit_slug populated.
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
  composio_toolkit_slug = excluded.composio_toolkit_slug,
  description = excluded.description,
  display_order = excluded.display_order;

delete from public.apps_catalog where slug = 'zapier';

-- Also update the canonical db_init.sql seed inline so fresh installs start correct.
-- (No-op SQL: this comment documents that Step 3 below edits db_init.sql.)
```

- [ ] **Step 3: Update `migrations/db_init.sql` to match (fresh installs)**

Open `admin-dashboard/migrations/db_init.sql` and find the `INSERT INTO public.apps_catalog` block at line ~610 (the one with the 10 service rows). Replace lines 610-621 (entire block including trailing `on conflict ... do nothing;`) with this new block:

```sql
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
on conflict (slug) do nothing;
```

Also find the `create table if not exists public.apps_catalog (` block at line 81 and add two new columns inside the parens (after `oauth_provider text,` and before `display_order integer not null default 0`):

```sql
  integration_kind text not null default 'composio'
    check (integration_kind in ('composio', 'insforge_native')),
  composio_toolkit_slug text,
```

The result should have 8 columns total: `slug, name, description, icon_url, oauth_provider, integration_kind, composio_toolkit_slug, display_order`. Leave `oauth_provider` in place — it's dead but removing it is a destructive change that's out of scope here.

- [ ] **Step 4: Apply the migration to the linked dev backend**

```bash
cd admin-dashboard
npx @insforge/cli db migrations up --all
```

Expected output: `Applied 1 migration: <MIGRATION_FILE>`. If you see `Already up to date`, the migration was not picked up — check the filename matches the CLI's naming rule.

- [ ] **Step 5: Verify schema applied**

```bash
npx @insforge/cli db query "select slug, integration_kind, composio_toolkit_slug from public.apps_catalog order by display_order"
```

Expected: 9 rows, `stripe` and `openrouter` have `integration_kind=insforge_native`, the other 7 have `integration_kind=composio` with their toolkit slug populated, and **no `zapier` row**.

- [ ] **Step 6: Commit**

```bash
cd /Users/carmen/.config/superpowers/worktrees/admin-dashboard-template
git add admin-dashboard/migrations/<MIGRATION_FILE> admin-dashboard/migrations/db_init.sql
git commit -m "admin-dashboard: schema for composio apps integration"
```

---

## Task 2: Edge function — `apps-connect`

**Files:**
- Create: `admin-dashboard/functions/apps-connect.ts`

This function takes `{ app_slug, workspace_id }`, looks up the toolkit's `auth_config_id` from secrets, calls Composio's `connectedAccounts/initiate`, and returns the redirect URL + request id.

- [ ] **Step 1: Create the file with this exact contents**

```typescript
import { createClient } from 'npm:@insforge/sdk'

// CORS — every InsForge function needs this for browser-invoked use.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const err = (status: number, code: string, detail?: string) =>
  json(status, { error: code, detail })

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') return err(405, 'method_not_allowed')

  // RLS-scoped client using the caller's JWT.
  const authHeader = req.headers.get('Authorization')
  const userToken = authHeader ? authHeader.replace('Bearer ', '') : null
  if (!userToken) return err(401, 'unauthorized')

  const client = createClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
    edgeFunctionToken: userToken,
  })

  const { data: userData } = await client.auth.getCurrentUser()
  if (!userData?.user?.id) return err(401, 'unauthorized')

  let body: { app_slug?: string; workspace_id?: string }
  try {
    body = await req.json()
  } catch {
    return err(400, 'invalid_json')
  }
  const { app_slug, workspace_id } = body
  if (!app_slug || !workspace_id) return err(400, 'missing_fields')

  // Look up the toolkit slug. RLS allows any authenticated read on apps_catalog.
  const { data: appRow, error: appErr } = await client.database
    .from('apps_catalog')
    .select('integration_kind, composio_toolkit_slug')
    .eq('slug', app_slug)
    .single()
  if (appErr || !appRow) return err(404, 'app_not_found', appErr?.message)
  if (appRow.integration_kind !== 'composio' || !appRow.composio_toolkit_slug) {
    return err(400, 'not_a_composio_app')
  }

  const authConfigId = Deno.env.get(
    `COMPOSIO_AUTH_CONFIG_${appRow.composio_toolkit_slug.toUpperCase()}`,
  )
  if (!authConfigId) return err(500, 'auth_config_not_provisioned')

  const composioApiKey = Deno.env.get('COMPOSIO_API_KEY')
  if (!composioApiKey) return err(500, 'composio_api_key_missing')

  // Composio v3 REST: initiate a connected account request.
  // Docs: https://docs.composio.dev/api-reference/v3/connected-accounts
  const initRes = await fetch('https://backend.composio.dev/api/v3/connected_accounts/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': composioApiKey,
    },
    body: JSON.stringify({
      auth_config_id: authConfigId,
      // One Composio "user" per InsForge workspace — connections are workspace-scoped.
      user_id: workspace_id,
    }),
  })

  if (!initRes.ok) {
    const text = await initRes.text()
    return err(502, 'composio_initiate_failed', text)
  }
  const init = (await initRes.json()) as { id: string; redirect_url?: string; redirectUrl?: string }

  return json(200, {
    request_id: init.id,
    redirect_url: init.redirect_url ?? init.redirectUrl,
  })
}
```

> **Confirm the exact field names** for the Composio v3 initiate endpoint (`auth_config_id` vs `authConfigId`, `user_id` vs `userId`, `redirect_url` vs `redirectUrl`) by running `curl -H "x-api-key: $COMPOSIO_API_KEY" https://backend.composio.dev/api/v3/connected_accounts/initiate -d '{...}' -i` against a real `auth_config_id` once secrets are provisioned. If a field name differs from what's coded above, fix it in this file and propagate to `apps-poll.ts` (Task 3) and `apps-disconnect.ts` (Task 4) before deploying.

- [ ] **Step 2: Deploy the function**

```bash
cd admin-dashboard
npx @insforge/cli functions deploy apps-connect --file ./functions/apps-connect.ts --description "Composio Connected Account initiate"
```

Expected: `Function apps-connect deployed (status: active)`. If status is `error`, run `npx @insforge/cli functions code apps-connect` to inspect what landed and `npx @insforge/cli logs function-deploy.logs --limit 10` to see why.

- [ ] **Step 3: Verify it deployed**

```bash
npx @insforge/cli functions list | grep apps-connect
```

Expected: `apps-connect | active`.

- [ ] **Step 4: Commit**

```bash
cd /Users/carmen/.config/superpowers/worktrees/admin-dashboard-template
git add admin-dashboard/functions/apps-connect.ts
git commit -m "admin-dashboard: apps-connect edge function for composio oauth initiate"
```

---

## Task 3: Edge function — `apps-poll`

**Files:**
- Create: `admin-dashboard/functions/apps-poll.ts`

Polls the Composio connection by request_id. On `ACTIVE`, upserts into `app_connections` with `config_json` populated.

- [ ] **Step 1: Create the file**

```typescript
import { createClient } from 'npm:@insforge/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const err = (status: number, code: string, detail?: string) =>
  json(status, { error: code, detail })

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'GET') return err(405, 'method_not_allowed')

  const authHeader = req.headers.get('Authorization')
  const userToken = authHeader ? authHeader.replace('Bearer ', '') : null
  if (!userToken) return err(401, 'unauthorized')

  const client = createClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
    edgeFunctionToken: userToken,
  })

  const { data: userData } = await client.auth.getCurrentUser()
  if (!userData?.user?.id) return err(401, 'unauthorized')

  const url = new URL(req.url)
  const request_id = url.searchParams.get('request_id')
  const app_slug = url.searchParams.get('app_slug')
  const workspace_id = url.searchParams.get('workspace_id')
  if (!request_id || !app_slug || !workspace_id) return err(400, 'missing_fields')

  const composioApiKey = Deno.env.get('COMPOSIO_API_KEY')
  if (!composioApiKey) return err(500, 'composio_api_key_missing')

  const res = await fetch(
    `https://backend.composio.dev/api/v3/connected_accounts/${encodeURIComponent(request_id)}`,
    { headers: { 'x-api-key': composioApiKey } },
  )
  if (!res.ok) return err(502, 'composio_get_failed', await res.text())

  const account = (await res.json()) as {
    id: string
    status: string
    data?: Record<string, unknown>
    created_at?: string
  }

  // Composio v3 statuses: INITIATED, ACTIVE, FAILED, INACTIVE, EXPIRED, REVOKED.
  if (account.status === 'INITIATED') return json(200, { status: 'pending' })
  if (account.status !== 'ACTIVE') {
    return json(200, { status: 'failed', detail: account.status })
  }

  // Build a friendly label from whatever Composio surfaced. Different toolkits put
  // different shapes in account.data — fall back gracefully.
  const dataObj = (account.data ?? {}) as Record<string, unknown>
  const account_label =
    (dataObj.account_label as string | undefined) ??
    (dataObj.user_email as string | undefined) ??
    (dataObj.email as string | undefined) ??
    (dataObj.login as string | undefined) ??
    (dataObj.name as string | undefined) ??
    null

  const { error: upsertErr } = await client.database
    .from('app_connections')
    .upsert(
      {
        workspace_id,
        app_slug,
        status: 'connected',
        connected_by: userData.user.id,
        connected_at: new Date().toISOString(),
        config_json: {
          kind: 'composio',
          connected_account_id: account.id,
          account_label,
          connected_at_provider: account.created_at ?? null,
        },
      },
      { onConflict: 'workspace_id,app_slug' },
    )

  if (upsertErr) return err(500, 'db_upsert_failed', upsertErr.message)

  return json(200, { status: 'connected', account_label })
}
```

> Same caveat as Task 2: confirm Composio field names (`status` enum values, `data` shape, `created_at` vs `createdAt`) by inspecting one real `GET /connected_accounts/{id}` response after the first end-to-end auth in Task 10. Adjust this file if reality differs.

- [ ] **Step 2: Deploy**

```bash
cd admin-dashboard
npx @insforge/cli functions deploy apps-poll --file ./functions/apps-poll.ts --description "Composio Connected Account status poll + persist"
```

- [ ] **Step 3: Verify**

```bash
npx @insforge/cli functions list | grep apps-poll
```

Expected: `apps-poll | active`.

- [ ] **Step 4: Commit**

```bash
cd /Users/carmen/.config/superpowers/worktrees/admin-dashboard-template
git add admin-dashboard/functions/apps-poll.ts
git commit -m "admin-dashboard: apps-poll edge function for composio status + persist"
```

---

## Task 4: Edge function — `apps-disconnect`

**Files:**
- Create: `admin-dashboard/functions/apps-disconnect.ts`

Revokes the Composio connection (best-effort) and deletes the row from `app_connections`.

- [ ] **Step 1: Create the file**

```typescript
import { createClient } from 'npm:@insforge/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const err = (status: number, code: string, detail?: string) =>
  json(status, { error: code, detail })

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') return err(405, 'method_not_allowed')

  const authHeader = req.headers.get('Authorization')
  const userToken = authHeader ? authHeader.replace('Bearer ', '') : null
  if (!userToken) return err(401, 'unauthorized')

  const client = createClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
    edgeFunctionToken: userToken,
  })

  const { data: userData } = await client.auth.getCurrentUser()
  if (!userData?.user?.id) return err(401, 'unauthorized')

  let body: { app_slug?: string; workspace_id?: string }
  try {
    body = await req.json()
  } catch {
    return err(400, 'invalid_json')
  }
  const { app_slug, workspace_id } = body
  if (!app_slug || !workspace_id) return err(400, 'missing_fields')

  // RLS scopes this select to the caller's workspace memberships automatically.
  const { data: existing } = await client.database
    .from('app_connections')
    .select('config_json')
    .eq('workspace_id', workspace_id)
    .eq('app_slug', app_slug)
    .maybeSingle()

  const composioId =
    (existing?.config_json as Record<string, unknown> | null | undefined)?.connected_account_id as
      | string
      | undefined

  if (composioId) {
    const composioApiKey = Deno.env.get('COMPOSIO_API_KEY')
    if (composioApiKey) {
      // Best-effort: a 404 from Composio means the connection is already gone.
      await fetch(
        `https://backend.composio.dev/api/v3/connected_accounts/${encodeURIComponent(composioId)}`,
        { method: 'DELETE', headers: { 'x-api-key': composioApiKey } },
      ).catch(() => {})
    }
  }

  const { error: delErr } = await client.database
    .from('app_connections')
    .delete()
    .eq('workspace_id', workspace_id)
    .eq('app_slug', app_slug)
  if (delErr) return err(500, 'db_delete_failed', delErr.message)

  return json(200, { ok: true })
}
```

- [ ] **Step 2: Deploy**

```bash
cd admin-dashboard
npx @insforge/cli functions deploy apps-disconnect --file ./functions/apps-disconnect.ts --description "Composio Connected Account revoke + cleanup"
```

- [ ] **Step 3: Verify**

```bash
npx @insforge/cli functions list | grep apps-disconnect
```

Expected: `apps-disconnect | active`.

- [ ] **Step 4: Commit**

```bash
cd /Users/carmen/.config/superpowers/worktrees/admin-dashboard-template
git add admin-dashboard/functions/apps-disconnect.ts
git commit -m "admin-dashboard: apps-disconnect edge function for composio revoke"
```

---

## Task 5: Frontend — extend `use-apps.ts` data shape

**Files:**
- Modify: `admin-dashboard/src/features/apps/use-apps.ts`

Surface `integration_kind`, `composio_toolkit_slug`, `account_label` (from `config_json`), and a computed `oss_dashboard_path` for native apps.

- [ ] **Step 1: Replace the file's contents with this exact code**

```typescript
import { useQuery } from '@tanstack/react-query'
import { insforge } from '@/lib/insforge'

export type IntegrationKind = 'composio' | 'insforge_native'

export type App = {
  slug: string
  name: string
  description: string
  icon_url: string | null
  integration_kind: IntegrationKind
  composio_toolkit_slug: string | null
  display_order: number
}

type ConnectionConfig = {
  kind?: 'composio'
  connected_account_id?: string
  account_label?: string | null
}

export type AppConnection = {
  id: string
  workspace_id: string
  app_slug: string
  status: 'connected' | 'disconnected'
  connected_at: string
  connected_by: string
  config_json: ConnectionConfig | null
}

// Deep-link targets in the OSS dashboard for the two native apps.
const OSS_DEEP_LINKS: Record<string, string> = {
  stripe: '/payments',
  openrouter: '/ai',
}

export type AppWithConnection = {
  slug: string
  name: string
  description: string
  icon_url: string | null
  display_order: number
  integration_kind: IntegrationKind
  composio_toolkit_slug: string | null
  oss_dashboard_path: string | null
  connected: boolean
  account_label: string | null
}

export const appsKey = (workspaceId: string | undefined) => ['apps', workspaceId] as const

export function useApps(workspaceId: string | undefined) {
  return useQuery({
    enabled: !!workspaceId,
    queryKey: appsKey(workspaceId),
    queryFn: async (): Promise<AppWithConnection[]> => {
      const [catalogRes, connectionsRes] = await Promise.all([
        insforge.database
          .from('apps_catalog')
          .select(
            'slug, name, description, icon_url, integration_kind, composio_toolkit_slug, display_order',
          )
          .order('display_order', { ascending: true }),
        insforge.database
          .from('app_connections')
          .select('id, workspace_id, app_slug, status, connected_at, connected_by, config_json')
          .eq('workspace_id', workspaceId!),
      ])

      if (catalogRes.error) throw new Error(catalogRes.error.message)
      if (connectionsRes.error) throw new Error(connectionsRes.error.message)

      const catalog = (catalogRes.data ?? []) as App[]
      const connections = (connectionsRes.data ?? []) as AppConnection[]
      const bySlug = new Map(connections.filter((c) => c.status === 'connected').map((c) => [c.app_slug, c]))

      return catalog.map((app) => {
        const conn = bySlug.get(app.slug)
        return {
          slug: app.slug,
          name: app.name,
          description: app.description,
          icon_url: app.icon_url,
          display_order: app.display_order,
          integration_kind: app.integration_kind,
          composio_toolkit_slug: app.composio_toolkit_slug,
          oss_dashboard_path: OSS_DEEP_LINKS[app.slug] ?? null,
          connected: !!conn,
          account_label: conn?.config_json?.account_label ?? null,
        }
      })
    },
  })
}
```

- [ ] **Step 2: Typecheck**

```bash
cd admin-dashboard && npm run typecheck
```

Expected: passes. If the `apps-grid.tsx` or `apps-page.tsx` consumers complain about missing properties, that's expected — Task 7 fixes the grid and Task 8 fixes the page. Note any errors involving files **other than** those two — those would indicate a regression.

> **Do not commit yet** — leave the working tree dirty so Tasks 6-8 land alongside as a single coherent change. The intermediate state will not typecheck.

---

## Task 6: Frontend — create `use-connect-app.ts`

**Files:**
- Create: `admin-dashboard/src/features/apps/use-connect-app.ts`

A single mutation that branches on `integration_kind`. For `composio`: opens popup → polls. For `insforge_native`: opens the OSS dashboard deep-link in a new tab.

- [ ] **Step 1: Create the file**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { insforge } from '@/lib/insforge'
import { appsKey, type AppWithConnection } from './use-apps'

const POLL_INTERVAL_MS = 1500
const POLL_DEADLINE_MS = 120_000 // 2 minutes
const OSS_BASE_URL = import.meta.env.VITE_INSFORGE_OSS_URL ?? 'https://app.insforge.dev'

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

type ConnectArgs = { app: AppWithConnection }

async function connectComposio(args: {
  appSlug: string
  workspaceId: string
}): Promise<{ account_label: string | null }> {
  // Open the popup synchronously to avoid being blocked. The URL is rewritten
  // once the initiate call resolves.
  const popup = window.open('about:blank', 'composio-oauth', 'width=600,height=720')
  if (!popup) throw new Error('Popup blocked — allow popups for this site and try again.')

  try {
    const { data: initData, error: initErr } = await insforge.functions.invoke('apps-connect', {
      body: { app_slug: args.appSlug, workspace_id: args.workspaceId },
    })
    if (initErr) throw new Error(initErr.message ?? 'Failed to start authorization')

    const { redirect_url, request_id } = initData as { redirect_url: string; request_id: string }
    if (!redirect_url || !request_id) throw new Error('Composio did not return a redirect URL')

    popup.location.href = redirect_url

    const deadline = Date.now() + POLL_DEADLINE_MS
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS)

      const { data: pollData, error: pollErr } = await insforge.functions.invoke('apps-poll', {
        method: 'GET',
        body: {
          request_id,
          app_slug: args.appSlug,
          workspace_id: args.workspaceId,
        },
      })
      if (pollErr) throw new Error(pollErr.message ?? 'Polling failed')

      const result = pollData as { status: 'pending' | 'connected' | 'failed'; account_label?: string | null; detail?: string }
      if (result.status === 'connected') {
        return { account_label: result.account_label ?? null }
      }
      if (result.status === 'failed') {
        throw new Error(`Authorization failed (${result.detail ?? 'unknown'})`)
      }
      // Treat user-closed popup as cancellation only after the next poll comes back pending.
      if (popup.closed && result.status === 'pending') {
        throw new Error('Authorization window was closed before completion')
      }
    }
    throw new Error('Authorization timed out after 2 minutes')
  } finally {
    if (!popup.closed) popup.close()
  }
}

export function useConnectApp(workspaceId: string | undefined) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ app }: ConnectArgs): Promise<void> => {
      if (!workspaceId) throw new Error('No active workspace')

      if (app.integration_kind === 'insforge_native') {
        if (!app.oss_dashboard_path) throw new Error('No dashboard path for this app')
        window.open(`${OSS_BASE_URL}${app.oss_dashboard_path}`, '_blank', 'noopener,noreferrer')
        return
      }

      await connectComposio({ appSlug: app.slug, workspaceId })
    },
    onSuccess: (_data, { app }) => {
      if (app.integration_kind === 'composio') {
        toast.success(`${app.name} connected`)
        void qc.invalidateQueries({ queryKey: appsKey(workspaceId) })
      }
      // For insforge_native we just opened a new tab — no toast needed.
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
```

> Note: `insforge.functions.invoke` with `method: 'GET'` still serializes `body` into the request — confirm this against the SDK behavior. If GET + body is not supported, change `apps-poll` to accept POST and update both ends accordingly.

- [ ] **Step 2: Typecheck**

```bash
cd admin-dashboard && npm run typecheck
```

Expected: passes for this file. Pre-existing errors in `apps-grid.tsx` / `apps-page.tsx` remain (fixed in Tasks 7-8).

---

## Task 7: Frontend — create `use-disconnect-app.ts`

**Files:**
- Create: `admin-dashboard/src/features/apps/use-disconnect-app.ts`

- [ ] **Step 1: Create the file**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { insforge } from '@/lib/insforge'
import { appsKey, type AppWithConnection } from './use-apps'

type DisconnectArgs = { app: AppWithConnection }

export function useDisconnectApp(workspaceId: string | undefined) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ app }: DisconnectArgs): Promise<void> => {
      if (!workspaceId) throw new Error('No active workspace')
      if (app.integration_kind !== 'composio') {
        throw new Error('Native integrations are managed in the InsForge dashboard')
      }
      const { error } = await insforge.functions.invoke('apps-disconnect', {
        body: { app_slug: app.slug, workspace_id: workspaceId },
      })
      if (error) throw new Error(error.message ?? 'Disconnect failed')
    },
    onSuccess: (_data, { app }) => {
      toast.success(`${app.name} disconnected`)
      void qc.invalidateQueries({ queryKey: appsKey(workspaceId) })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
```

- [ ] **Step 2: Delete the obsolete hook**

```bash
rm admin-dashboard/src/features/apps/use-toggle-app.ts
```

---

## Task 8: Frontend — rewrite `apps-grid.tsx`

**Files:**
- Modify: `admin-dashboard/src/features/apps/apps-grid.tsx`

Drop the `Switch`. Render kind-aware actions: Composio cards get "Connect" / "Connecting…" / "Connected as X + Disconnect"; native cards get "Configure in dashboard" only.

- [ ] **Step 1: Replace the file's contents**

```typescript
import { ExternalLink, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AppWithConnection } from './use-apps'

type Props = {
  apps: AppWithConnection[]
  isLoading: boolean
  isConnectPending: (slug: string) => boolean
  isDisconnectPending: (slug: string) => boolean
  onConnect: (app: AppWithConnection) => void
  onDisconnect: (app: AppWithConnection) => void
}

export function AppsGrid({
  apps,
  isLoading,
  isConnectPending,
  isDisconnectPending,
  onConnect,
  onDisconnect,
}: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (apps.length === 0) {
    return <p className="text-sm text-muted-foreground">No apps available.</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {apps.map((app) => {
        const connectPending = isConnectPending(app.slug)
        const disconnectPending = isDisconnectPending(app.slug)
        const isNative = app.integration_kind === 'insforge_native'

        return (
          <Card key={app.slug} className="relative flex flex-col">
            {app.connected && (
              <Badge variant="secondary" className="absolute right-3 top-3">
                Connected
              </Badge>
            )}
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                {app.icon_url ? (
                  <img
                    src={app.icon_url}
                    alt={`${app.name} icon`}
                    className="h-10 w-10 rounded-md bg-muted p-1.5 dark:bg-white"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-md bg-muted" />
                )}
                <CardTitle className="text-base">{app.name}</CardTitle>
              </div>
              <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                {app.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="mt-auto flex items-center justify-between gap-3 pt-0">
              {isNative ? (
                <>
                  <span className="text-xs text-muted-foreground">
                    Managed in InsForge dashboard
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onConnect(app)}
                    aria-label={`Configure ${app.name} in dashboard`}
                  >
                    Configure
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  </Button>
                </>
              ) : app.connected ? (
                <>
                  <span className="truncate text-xs text-muted-foreground" title={app.account_label ?? undefined}>
                    {app.account_label ? `as ${app.account_label}` : 'Active integration'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disconnectPending}
                    onClick={() => onDisconnect(app)}
                    aria-label={`Disconnect ${app.name}`}
                  >
                    {disconnectPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                        Disconnecting…
                      </>
                    ) : (
                      'Disconnect'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">Not connected</span>
                  <Button
                    size="sm"
                    disabled={connectPending}
                    onClick={() => onConnect(app)}
                    aria-label={`Connect ${app.name}`}
                  >
                    {connectPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                        Connecting…
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd admin-dashboard && npm run typecheck
```

Expected: this file passes. The remaining error should now be in `apps-page.tsx`, fixed in Task 9.

---

## Task 9: Frontend — wire `apps-page.tsx`

**Files:**
- Modify: `admin-dashboard/src/features/apps/apps-page.tsx`

- [ ] **Step 1: Read the current contents** to learn what props were being passed.

```bash
cat admin-dashboard/src/features/apps/apps-page.tsx
```

- [ ] **Step 2: Edit the file** so it uses the new hooks and passes the new `AppsGrid` props.

Replace the import of `useToggleApp` with the two new hooks, instantiate both, and pass `isConnectPending`, `isDisconnectPending`, `onConnect`, `onDisconnect` instead of the old `isPending` + `onToggle`. The pending-checker pattern:

```typescript
const connect = useConnectApp(workspaceId)
const disconnect = useDisconnectApp(workspaceId)

const isConnectPending = (slug: string) =>
  connect.isPending && connect.variables?.app.slug === slug
const isDisconnectPending = (slug: string) =>
  disconnect.isPending && disconnect.variables?.app.slug === slug

return (
  <AppsGrid
    apps={apps}
    isLoading={isLoading}
    isConnectPending={isConnectPending}
    isDisconnectPending={isDisconnectPending}
    onConnect={(app) => connect.mutate({ app })}
    onDisconnect={(app) => disconnect.mutate({ app })}
  />
)
```

Keep all other page chrome (header, description, error states) exactly as it was.

- [ ] **Step 3: Typecheck + lint**

```bash
cd admin-dashboard && npm run typecheck && npm run lint
```

Expected: both pass. If `lint` reports `no-unused-vars` for any leftover import, remove the import.

- [ ] **Step 4: Build**

```bash
cd admin-dashboard && npm run build
```

Expected: successful Vite production build, no TypeScript errors. The build asserts the SPA bundles cleanly.

- [ ] **Step 5: Commit all frontend changes together**

```bash
cd /Users/carmen/.config/superpowers/worktrees/admin-dashboard-template
git add admin-dashboard/src/features/apps/
git commit -m "admin-dashboard: replace apps toggle stub with composio + native split"
```

---

## Task 10: README + `.env.example`

**Files:**
- Modify: `admin-dashboard/README.md`
- Create/Modify: `admin-dashboard/.env.example`

- [ ] **Step 1: Add `VITE_INSFORGE_OSS_URL` to `.env.example`**

Read the file first:

```bash
ls -a admin-dashboard | grep -i env
```

If `.env.example` exists, append:

```
# OSS dashboard origin for native-integration deep links (Stripe / OpenRouter).
# Defaults to https://app.insforge.dev when unset.
VITE_INSFORGE_OSS_URL=https://app.insforge.dev
```

If it doesn't exist, create it with the three lines above as the entire contents (per memory: dotfiles can be invisible to bare `ls` — `ls -a` was used above to confirm).

- [ ] **Step 2: Rewrite the "Wire a real integration" section of README.md**

Find the existing "Wire a real integration" paragraph (referenced in the original `use-toggle-app.ts` comment at line ~149). Replace that paragraph and surrounding instructions with this new section:

````markdown
## Connecting third-party apps

The `/apps` page lists every integration available to a workspace. Two kinds:

- **InsForge-native** (Stripe, OpenRouter) — configured in the InsForge dashboard. The card opens the corresponding dashboard page in a new tab.
- **Composio-backed** (GitHub, Notion, Slack, Discord, Figma, Linear, Vercel) — connected per workspace via Composio's hosted OAuth.

### One-time Composio setup

1. Sign up at [composio.dev](https://composio.dev) and create an API key in **Settings → API Keys**.
2. For each of the 7 toolkits (`github`, `notion`, `slack`, `discord`, `figma`, `linear`, `vercel`), open the **Toolkits** page, click the toolkit, then **Create Auth Config** with OAuth 2.0. Copy the resulting `auth_config_id` (`ac_…`).
3. Store every value in InsForge secrets:

   ```bash
   npx @insforge/cli secrets add COMPOSIO_API_KEY <your-api-key>
   npx @insforge/cli secrets add COMPOSIO_AUTH_CONFIG_GITHUB  ac_xxx
   npx @insforge/cli secrets add COMPOSIO_AUTH_CONFIG_NOTION  ac_xxx
   npx @insforge/cli secrets add COMPOSIO_AUTH_CONFIG_SLACK   ac_xxx
   npx @insforge/cli secrets add COMPOSIO_AUTH_CONFIG_DISCORD ac_xxx
   npx @insforge/cli secrets add COMPOSIO_AUTH_CONFIG_FIGMA   ac_xxx
   npx @insforge/cli secrets add COMPOSIO_AUTH_CONFIG_LINEAR  ac_xxx
   npx @insforge/cli secrets add COMPOSIO_AUTH_CONFIG_VERCEL  ac_xxx
   ```

4. Deploy the three edge functions:

   ```bash
   npx @insforge/cli functions deploy apps-connect    --file ./functions/apps-connect.ts
   npx @insforge/cli functions deploy apps-poll       --file ./functions/apps-poll.ts
   npx @insforge/cli functions deploy apps-disconnect --file ./functions/apps-disconnect.ts
   ```

Composio routes its OAuth callback to its own domain — you do **not** need to add any URLs to `insforge.toml`. You do need to allow popups in your browser; the connect flow opens one synchronously when the user clicks "Connect".
````

- [ ] **Step 3: Commit**

```bash
cd /Users/carmen/.config/superpowers/worktrees/admin-dashboard-template
git add admin-dashboard/README.md admin-dashboard/.env.example
git commit -m "admin-dashboard: document composio apps setup"
```

---

## Task 11: End-to-end smoke verification

This is the verification gate that replaces unit tests. Driven manually in a browser. **Do not skip** — typecheck/lint/build do not cover the runtime OAuth flow.

- [ ] **Step 1: Prerequisites**

Confirm the following are true before starting:

```bash
cd admin-dashboard
npx @insforge/cli secrets list | grep COMPOSIO   # should list COMPOSIO_API_KEY + 7 AUTH_CONFIG entries
npx @insforge/cli functions list                   # apps-connect, apps-poll, apps-disconnect all 'active'
npx @insforge/cli db query "select slug, integration_kind from public.apps_catalog order by display_order"
# expected: 9 rows, no zapier
```

If any check fails, stop and fix the corresponding task before continuing.

- [ ] **Step 2: Run the dev server**

```bash
cd admin-dashboard && npm run dev
```

- [ ] **Step 3: Drive the Slack flow**

1. Open the printed URL, sign in (or sign up), create a workspace if you don't have one.
2. Navigate to `/apps`. Expected: 9 cards. Stripe + OpenRouter show **Configure** buttons; the other 7 show **Connect** buttons. No Zapier card.
3. Click **Connect** on Slack. A popup opens to a `slack.com` URL via `backend.composio.dev`.
4. Authorize. Popup closes (or returns to a Composio confirmation page that you can close).
5. Within ~3 seconds the Slack card re-renders to show the **Connected** badge and `as <your slack handle/email>`, plus a **Disconnect** button.
6. Refresh the page — state persists (`as ...` still shown).

- [ ] **Step 4: Verify the DB row**

```bash
npx @insforge/cli db query "select app_slug, status, config_json from public.app_connections where app_slug='slack'"
```

Expected: one row with `status=connected` and `config_json` containing `kind: composio`, a `connected_account_id`, and a non-null `account_label`.

- [ ] **Step 5: Verify Composio dashboard**

Open the Composio dashboard → Connected Accounts. Expected: a new ACTIVE row for Slack scoped to the workspace UUID (passed as `user_id`).

- [ ] **Step 6: Disconnect**

Click **Disconnect** on the Slack card. Expected: card returns to **Connect** state.

```bash
npx @insforge/cli db query "select count(*) from public.app_connections where app_slug='slack'"
```

Expected: `0`. The Composio dashboard row should also be gone (or marked deleted depending on Composio's UI).

- [ ] **Step 7: Spot-check a second toolkit**

Repeat steps 3-4 for **GitHub** to confirm the code path is toolkit-agnostic.

- [ ] **Step 8: Spot-check the native deep-link**

Click **Configure** on Stripe. Expected: a new tab opens to `<VITE_INSFORGE_OSS_URL>/payments`.

- [ ] **Step 9: Final summary**

If steps 3-8 all pass, the integration is functionally complete. If any step fails, identify the failing task above and fix it. No commit for this task (no code changes).

---

## Self-Review Notes

**Spec coverage:** Tasks 1-10 implement spec sections 4 (schema), 5 (edge functions), 6 (frontend), 7 (Composio setup), and 8 (env vars). Spec section 9 gotchas are baked in: (1) workspace_id as Composio user_id — Task 2 step 1; (2) polling cadence — Task 6 step 1 (1.5 s × 80 = 120 s deadline); (3) popup blockers — Task 6 step 1 opens popup synchronously before await; (4) `VITE_INSFORGE_OSS_URL` for self-hosted — Task 10. Spec section 10 demo path == Task 11.

**Open contract risks** (called out at point-of-use): Composio v3 REST field naming (Tasks 2-3) and `insforge.functions.invoke` GET-with-body support (Task 6). Both will be caught immediately by Task 11 step 3 if wrong.

**No placeholders.** Every code block is a complete, copy-pasteable artifact. Where this plan defers to "read the file first" (Task 9 step 1), it's because the current file's structure isn't shown in the spec and we want to minimize what gets rewritten.
