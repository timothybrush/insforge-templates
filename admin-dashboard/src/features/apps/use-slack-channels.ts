import { useQuery } from '@tanstack/react-query'
import { insforge } from '@/lib/insforge'

export type SlackChannel = {
  id: string
  name: string
  is_private: boolean
}

export const slackChannelsKey = (workspaceId: string | undefined) =>
  ['slack-channels', workspaceId] as const

export function useSlackChannels(workspaceId: string | undefined, enabled: boolean) {
  return useQuery({
    enabled: !!workspaceId && enabled,
    queryKey: slackChannelsKey(workspaceId),
    queryFn: async (): Promise<SlackChannel[]> => {
      const { data, error } = await insforge.functions.invoke('apps-slack-list-channels', {
        method: 'POST',
        body: { workspace_id: workspaceId },
      })
      if (error) throw new Error(error.message ?? 'Failed to load Slack channels')
      const channels = (data as { channels?: SlackChannel[] } | null)?.channels ?? []
      return channels
    },
    staleTime: 60 * 1000,
  })
}
