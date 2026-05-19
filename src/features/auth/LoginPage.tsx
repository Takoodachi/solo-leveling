import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from './useAuth'

export default function LoginPage() {
  const { signInWithEmail, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signInWithEmail(email)
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      setSent(true)
    }
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <Dumbbell className="text-primary" size={48} />
        <h1 className="text-2xl font-bold">Solo Leveling</h1>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Add your Supabase credentials to <code>.env.local</code> to enable sync and sign-in.
          See <code>.env.local.example</code> for instructions.
        </p>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <Dumbbell className="text-primary" size={48} />
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          We sent a magic link to <strong>{email}</strong>. Tap it to sign in.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <Dumbbell className="text-primary" size={48} />
          <h1 className="text-2xl font-bold">Solo Leveling</h1>
          <p className="text-sm text-muted-foreground">Sign in to sync across devices</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send magic link'}
          </Button>
        </form>
      </div>
    </div>
  )
}
