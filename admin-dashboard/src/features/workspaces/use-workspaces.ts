import { useQuery } from '@tanstack/react-query'
import { insforge } from '@/lib/insforge'

export type Workspace = {
  id: string
  slug: string
  name: string
  owner_id: string
  created_at: string
}

export type WorkspaceMembership = Workspace & { role: 'owner' | 'admin' | 'member' }

export function useWorkspaces(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ['workspaces', userId],
    queryFn: async (): Promise<WorkspaceMembership[]> => {
      const { data, error } = await insforge.database
        .from('workspace_members')
        .select('role, workspaces(id, slug, name, owner_id, created_at)')
        .eq('user_id', userId!)
      if (error) throw new Error(error.message)
      return ((data ?? []) as unknown as Array<{ role: WorkspaceMembership['role']; workspaces: Workspace }>)
        .filter((r) => !!r.workspaces)
        .map((r) => ({ ...r.workspaces, role: r.role }))
    },
  })
}
