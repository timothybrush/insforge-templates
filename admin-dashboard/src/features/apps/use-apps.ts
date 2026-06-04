import { useQuery } from '@tanstack/react-query'
import { insforge } from '@/lib/insforge'

export type App = {
  slug: string
  name: string
  description: string
  icon_url: string | null
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

export type AppWithConnection = {
  slug: string
  name: string
  description: string
  icon_url: string | null
  display_order: number
  composio_toolkit_slug: string | null
  connected: boolean
  account_label: string | null
  is_available: boolean
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
            'slug, name, description, icon_url, composio_toolkit_slug, display_order',
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
      const bySlug = new Map(
        connections.filter((c) => c.status === 'connected').map((c) => [c.app_slug, c]),
      )

      return catalog.map((app) => {
        const conn = bySlug.get(app.slug)
        return {
          slug: app.slug,
          name: app.name,
          description: app.description,
          icon_url: app.icon_url,
          display_order: app.display_order,
          composio_toolkit_slug: app.composio_toolkit_slug,
          connected: !!conn,
          account_label: conn?.config_json?.account_label ?? null,
          is_available: false,
        }
      })
    },
  })
}
