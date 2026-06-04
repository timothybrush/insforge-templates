import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { insforge } from '@/lib/insforge'
import { appsKey, type AppWithConnection } from './use-apps'

const POLL_INTERVAL_MS = 1500
const POLL_DEADLINE_MS = 120_000

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

type ConnectArgs = { app: AppWithConnection }

async function connectComposio(args: {
  appSlug: string
  workspaceId: string
}): Promise<{ account_label: string | null }> {
  const popup = window.open('about:blank', 'composio-oauth', 'width=600,height=720')
  if (!popup) throw new Error('Popup blocked — allow popups for this site and try again.')

  try {
    const { data: initData, error: initErr } = await insforge.functions.invoke('apps-connect', {
      method: 'POST',
      body: { app_slug: args.appSlug, workspace_id: args.workspaceId },
    })
    if (initErr) throw new Error(initErr.message ?? 'Failed to start authorization')

    const { redirect_url, request_id } = initData as {
      redirect_url: string
      request_id: string
    }
    if (!redirect_url || !request_id) throw new Error('Composio did not return a redirect URL')

    popup.location.href = redirect_url

    const deadline = Date.now() + POLL_DEADLINE_MS
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS)

      const { data: pollData, error: pollErr } = await insforge.functions.invoke('apps-poll', {
        method: 'POST',
        body: {
          request_id,
          app_slug: args.appSlug,
          workspace_id: args.workspaceId,
        },
      })
      if (pollErr) throw new Error(pollErr.message ?? 'Polling failed')

      const result = pollData as {
        status: 'pending' | 'connected' | 'failed'
        account_label?: string | null
        detail?: string
      }
      if (result.status === 'connected') {
        return { account_label: result.account_label ?? null }
      }
      if (result.status === 'failed') {
        throw new Error(`Authorization failed (${result.detail ?? 'unknown'})`)
      }
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
      await connectComposio({ appSlug: app.slug, workspaceId })
    },
    onSuccess: (_data, { app }) => {
      toast.success(`${app.name} connected`)
      void qc.invalidateQueries({ queryKey: appsKey(workspaceId) })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
