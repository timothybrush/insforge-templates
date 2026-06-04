import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { insforge } from '@/lib/insforge'

type SendArgs = {
  taskId: string
  taskTitle: string
  channelId: string
  channelName: string
}

export function useSendTaskToSlack(workspaceId: string | undefined) {
  return useMutation({
    mutationFn: async (args: SendArgs) => {
      if (!workspaceId) throw new Error('No active workspace')
      const { error } = await insforge.functions.invoke('apps-slack-send-task', {
        method: 'POST',
        body: {
          task_id: args.taskId,
          workspace_id: workspaceId,
          channel: args.channelId,
        },
      })
      if (error) throw new Error(error.message ?? 'Failed to send to Slack')
      return args
    },
    onSuccess: (args) => {
      toast.success(`Sent "${args.taskTitle}" to #${args.channelName}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
