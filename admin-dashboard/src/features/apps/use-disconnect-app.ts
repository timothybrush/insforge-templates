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
