import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { insforge } from '@/lib/insforge'
import { useAuth } from '@/lib/auth-context'
import { ensureWorkspace } from '@/features/auth/ensure-workspace'
import { useWorkspaceStore } from '@/features/workspaces/workspace-store'

export const Route = createFileRoute('/(auth)/sign-in-2')({
  component: SignIn2Page,
})

function SignIn2Page() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error || !data?.user) {
      toast.error(error?.message ?? 'Sign in failed')
      return
    }
    const user = data.user as { id: string; email: string }
    const wsId = await ensureWorkspace(user.id, user.email)
    setActiveWorkspaceId(wsId)
    await refresh()
    navigate({ to: '/dashboard' })
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-muted lg:flex lg:items-center lg:justify-center lg:p-12">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-foreground" />
          <h2 className="text-3xl font-bold">Manage your workspace</h2>
          <p className="max-w-md text-muted-foreground">Sidebar, charts, tables, settings, and real-time chat — wired to InsForge auth, DB, RLS, storage, and realtime.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-left">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">Use the email and password for your workspace.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            New here?{' '}
            <Link to="/sign-up" className="font-medium text-foreground underline-offset-2 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
