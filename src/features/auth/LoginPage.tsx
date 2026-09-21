import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, Mail, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from './useAuth'

type Mode = 'password' | 'link' | 'link-sent'

/** `embedded`: opened from Profile while using the app locally (shows a back button, no "continue offline"). */
export default function LoginPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate()
  const { signInWithPassword, sendSignInLink, continueWithoutAccount } = useAuth()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = mode === 'password' ? await signInWithPassword(email, password) : await sendSignInLink(email)
    setBusy(false)
    if (error) setError(error)
    else if (mode === 'link') setMode('link-sent')
    else if (embedded) navigate('/profile', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pt-safe pb-safe pl-safe pr-safe">
      {embedded && (
        <button type="button" onClick={() => navigate(-1)} className="ml-2 mt-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-accent" aria-label="Back">
          <ChevronLeft size={24} />
        </button>
      )}
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="bg-brand-gradient flex h-20 w-20 items-center justify-center rounded-[28px] shadow-xl shadow-primary/30">
            <Dumbbell size={40} className="text-white" />
          </span>
          <div>
            <h1 className="text-3xl font-bold">Solo Leveling</h1>
            <p className="mt-1 text-muted-foreground">Sign in to sync across your devices</p>
          </div>
        </div>

        {mode === 'link-sent' ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-6 text-center">
            <Mail size={32} className="text-primary" />
            <p className="font-semibold">Check your email</p>
            <p className="text-sm text-muted-foreground">
              We sent a sign-in link to <strong className="text-foreground">{email}</strong>. On iPhone, open it in Safari, then set a password in Profile so the home-screen app can sign in.
            </p>
            <Button variant="secondary" onClick={() => setMode('password')}>Back</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            {mode === 'password' && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'password' ? 'Sign in' : 'Email me a link'}
            </Button>
            <button
              type="button"
              onClick={() => { setError(null); setMode(mode === 'password' ? 'link' : 'password') }}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {mode === 'password' ? 'No password yet? Email me a sign-in link' : 'Use password instead'}
            </button>
          </form>
        )}

        {!embedded && (
          <div className="flex flex-col items-center gap-2 border-t border-white/5 pt-6 text-center">
            <Button variant="ghost" onClick={continueWithoutAccount}>Continue without an account</Button>
            <p className="text-xs text-muted-foreground">Everything works offline. Your data stays on this device until you sign in.</p>
          </div>
        )}
      </div>
    </div>
  )
}
