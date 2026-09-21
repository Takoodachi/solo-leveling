import { useState } from 'react'
import { Flame, ShieldCheck, Star, Pencil, Check } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { Input } from '@/components/ui/input'
import { useGamification, xpForLevel } from '@/features/gamification/store'
import { useAuthStore } from '@/features/auth/authStore'
import { clampPercent } from '@/lib/format'
import { useSettings } from '../hooks/useSettings'

export default function ProfileCard() {
  const { settings, updateSettings } = useSettings()
  const email = useAuthStore(s => s.session?.user.email)
  const { xp, level, currentStreak, longestStreak, streakFreezes } = useGamification()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const name = settings?.displayName?.trim() || email?.split('@')[0] || ''
  const needed = xpForLevel(level)

  async function saveName() {
    await updateSettings({ displayName: draft.trim() || undefined })
    setEditing(false)
  }

  return (
    <section className="rounded-3xl bg-card p-5">
      <div className="flex items-center gap-4">
        <Avatar name={name} size={72} />
        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={e => { e.preventDefault(); void saveName() }} className="flex items-center gap-2">
              <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Your name" autoFocus className="h-10" />
              <button type="submit" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background" aria-label="Save name">
                <Check size={18} />
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => { setDraft(settings?.displayName ?? ''); setEditing(true) }} className="flex max-w-full items-center gap-2 text-left">
              <span className="truncate font-heading text-2xl font-bold">{name || 'Add your name'}</span>
              <Pencil size={15} className="shrink-0 text-muted-foreground" />
            </button>
          )}
          <p className="truncate text-sm text-muted-foreground">{email ?? 'Data stays on this device'}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-semibold"><Star size={15} className="fill-amber-300 text-amber-300" />Level {level}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{xp} / {needed} XP</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${clampPercent(xp, needed)}%` }} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-secondary py-3">
          <Flame size={18} className="mx-auto fill-primary text-primary" />
          <p className="mt-1 font-semibold">{currentStreak}</p>
          <p className="text-[11px] text-muted-foreground">Streak</p>
        </div>
        <div className="rounded-2xl bg-secondary py-3">
          <Flame size={18} className="mx-auto text-muted-foreground" />
          <p className="mt-1 font-semibold">{longestStreak}</p>
          <p className="text-[11px] text-muted-foreground">Best</p>
        </div>
        <div className="rounded-2xl bg-secondary py-3">
          <ShieldCheck size={18} className="mx-auto text-sky-400" />
          <p className="mt-1 font-semibold">{streakFreezes}</p>
          <p className="text-[11px] text-muted-foreground">Freezes</p>
        </div>
      </div>
    </section>
  )
}
