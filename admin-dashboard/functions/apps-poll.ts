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

  if (account.status === 'INITIATED') return json(200, { status: 'pending' })
  if (account.status !== 'ACTIVE') {
    return json(200, { status: 'failed', detail: account.status })
  }

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
