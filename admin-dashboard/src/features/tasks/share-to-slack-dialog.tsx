import { useMemo, useState } from 'react'
import { Hash, Loader2, Lock, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useSlackChannels, type SlackChannel } from '@/features/apps/use-slack-channels'
import { useSendTaskToSlack } from '@/features/apps/use-send-task-to-slack'
import type { Task } from './schemas'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  workspaceId: string | undefined
}

export function ShareToSlackDialog({ open, onOpenChange, task, workspaceId }: Props) {
  const [query, setQuery] = useState('')
  const { data: channels = [], isLoading, error } = useSlackChannels(workspaceId, open)
  const sendMutation = useSendTaskToSlack(workspaceId)

  const filtered = useMemo<SlackChannel[]>(() => {
    if (!query) return channels
    const q = query.toLowerCase()
    return channels.filter((c) => c.name.toLowerCase().includes(q))
  }, [channels, query])

  const handlePick = (channel: SlackChannel) => {
    if (!task) return
    sendMutation.mutate(
      {
        taskId: task.id,
        taskTitle: task.title,
        channelId: channel.id,
        channelName: channel.name,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setQuery('')
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (sendMutation.isPending) return
        if (!next) setQuery('')
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send to Slack</DialogTitle>
          <DialogDescription>
            {task ? `Pick a channel to share "${task.title}".` : 'Pick a Slack channel.'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search channels"
            className="pl-8"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="px-2 py-6 text-center text-sm text-destructive">
              {(error as Error).message}
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {channels.length === 0 ? 'No channels found.' : 'No matches.'}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((c) => {
                const isSending =
                  sendMutation.isPending && sendMutation.variables?.channelId === c.id
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(c)}
                      disabled={sendMutation.isPending}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent',
                        'disabled:opacity-50 disabled:hover:bg-transparent',
                      )}
                    >
                      {c.is_private ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      ) : (
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      )}
                      <span className="flex-1 truncate">{c.name}</span>
                      {isSending && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
