import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { insforge } from '@/lib/insforge'
import { useAuth } from '@/lib/auth-context'
import { ensureWorkspace } from '@/features/auth/ensure-workspace'
import { useWorkspaceStore } from '@/features/workspaces/workspace-store'

const VERIFIER_KEY = 'insforge.pkce_verifier'

export const Route = createFileRoute('/auth/callback')({
  component: OAuthCallbackPage,
  validateSearch: (search: Record<string, unknown>) => ({
    insforge_code: typeof search.insforge_code === 'string' ? search.insforge_code : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
    error_description: typeof search.error_description === 'string' ? search.error_description : undefined,
  }),
})

function OAuthCallbackPage() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId)
  const search = Route.useSearch()
  const ran = useRef(false)
  const [status, setStatus] = useState<string>('Completing sign-in…')

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    void (async () => {
      if (search.error) {
        toast.error(search.error_description ?? search.error)
        sessionStorage.removeItem(VERIFIER_KEY)
        navigate({ to: '/sign-in' })
        return
      }

      const code = search.insforge_code
      if (!code) {
        toast.error('Missing authorization code')
        navigate({ to: '/sign-in' })
        return
      }

      const codeVerifier = sessionStorage.getItem(VERIFIER_KEY) ?? undefined
      sessionStorage.removeItem(VERIFIER_KEY)

      const { data, error } = await insforge.auth.exchangeOAuthCode(code, codeVerifier)
      if (error || !data?.user) {
        toast.error(error?.message ?? 'Sign-in failed')
        navigate({ to: '/sign-in' })
        return
      }

      const user = data.user as { id: string; email: string }
      setStatus('Setting up your workspace…')
      try {
        const wsId = await ensureWorkspace(user.id, user.email)
        setActiveWorkspaceId(wsId)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not initialize workspace')
      }
      await refresh()
      navigate({ to: '/dashboard' })
    })()
  }, [search, navigate, refresh, setActiveWorkspaceId])

  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div className="space-y-2">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
    </div>
  )
}
