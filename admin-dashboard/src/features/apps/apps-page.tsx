import { useActiveWorkspace } from '@/features/dashboard/use-active-workspace'
import { useApps } from './use-apps'
import { useConnectApp } from './use-connect-app'
import { useDisconnectApp } from './use-disconnect-app'
import { AppsGrid } from './apps-grid'

export function AppsPage() {
  const { workspace } = useActiveWorkspace()
  const { data: apps = [], isLoading } = useApps(workspace?.id)
  const connect = useConnectApp(workspace?.id)
  const disconnect = useDisconnectApp(workspace?.id)

  const isConnectPending = (slug: string) =>
    connect.isPending && connect.variables?.app.slug === slug
  const isDisconnectPending = (slug: string) =>
    disconnect.isPending && disconnect.variables?.app.slug === slug

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Apps</h2>
        <p className="text-sm text-muted-foreground">
          Connect integrations to extend {workspace?.name ?? 'your workspace'}.
        </p>
      </div>
      <AppsGrid
        apps={apps}
        isLoading={isLoading}
        isConnectPending={isConnectPending}
        isDisconnectPending={isDisconnectPending}
        onConnect={(app) => connect.mutate({ app })}
        onDisconnect={(app) => disconnect.mutate({ app })}
      />
    </div>
  )
}
