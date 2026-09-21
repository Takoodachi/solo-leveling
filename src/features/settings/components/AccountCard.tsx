import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistance } from 'date-fns'
import { Cloud, CloudOff, RefreshCw, KeyRound, LogOut, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/useAuth'
import { useAuthStore } from '@/features/auth/authStore'
import { syncService } from '@/lib/sync'
import { useSyncStatus } from '@/lib/syncStatus'
import { useNow } from '@/hooks/useNow'

export default function AccountCard() {
  const navigate = useNavigate()
  const { session, isConfigured, setPassword, signOut } = useAuth()
  const userId = useAuthStore(s => s.userId)
  const status = useSyncStatus()
  const now = useNow(30_000)
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isConfigured) return null

  if (!session) {
    return (
      <div className="flex flex-col gap-3 rounded-3xl bg-card p-5">
        <p className="flex items-center gap-2 font-semibold"><CloudOff size={18} className="text-muted-foreground" /> Not syncing</p>
        <p className="text-sm text-muted-foreground">Sign in to back up your data and use it on another device. What you’ve logged here comes with you.</p>
        <Button className="gap-2" onClick={() => navigate('/login')}><LogIn size={16} /> Sign in</Button>
      </div>
    )
  }

  const synced = status.lastSyncedAt
    ? `Synced ${formatDistance(status.lastSyncedAt, Math.max(now.getTime(), status.lastSyncedAt), { addSuffix: true, includeSeconds: true })}`
    : 'Not synced yet'

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pw.length < 8) return toast.error('Use at least 8 characters')
    setBusy(true)
    const { error } = await setPassword(pw)
    setBusy(false)
    if (error) return toast.error(error)
    toast.success('Password updated')
    setPw('')
    setPwOpen(false)
  }

  async function handleSignOut() {
    const pending = await syncService.pendingCount()
    const msg = pending > 0
      ? `${pending} change${pending === 1 ? '' : 's'} haven’t reached the cloud yet and will be lost. Sign out anyway?`
      : 'Sign out? Your data stays in the cloud and is removed from this device.'
    if (!window.confirm(msg)) return
    await signOut()
    toast.success('Signed out')
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <div className="flex items-start gap-3">
        <Cloud size={20} className={status.state === 'error' ? 'mt-0.5 text-destructive' : 'mt-0.5 text-primary'} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{session.user.email}</p>
          <p className="text-sm text-muted-foreground">
            {status.state === 'syncing' ? 'Syncing…' : status.state === 'error' ? 'Last sync had a problem — will retry' : synced}
          </p>
        </div>
        <button
          type="button"
          onClick={() => userId && void syncService.sync(userId)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
          aria-label="Sync now"
        >
          <RefreshCw size={16} className={status.state === 'syncing' ? 'animate-spin' : ''} />
        </button>
      </div>

      {pwOpen ? (
        <form onSubmit={savePassword} className="flex gap-2">
          <Input type="password" autoComplete="new-password" placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} autoFocus />
          <Button type="submit" disabled={busy}>Save</Button>
        </form>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 gap-2" onClick={() => setPwOpen(true)}><KeyRound size={16} /> Password</Button>
          <Button variant="secondary" className="flex-1 gap-2" onClick={() => void handleSignOut()}><LogOut size={16} /> Sign out</Button>
        </div>
      )}
    </div>
  )
}
