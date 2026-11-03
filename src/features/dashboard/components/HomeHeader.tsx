import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { UserRound } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { useNow } from '@/hooks/useNow'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useAuthStore } from '@/features/auth/authStore'
import { toDateStr } from '@/lib/date'
import { greetingFor } from '../greetings'

export default function HomeHeader() {
  const { settings } = useSettings()
  const email = useAuthStore(s => s.session?.user.email)
  const now = useNow()
  const name = settings?.displayName?.trim() || email?.split('@')[0] || ''
  const firstName = name.split(/\s+/)[0]
  const greeting = greetingFor(toDateStr(now), firstName)

  return (
    <header className="flex items-center gap-4 pt-3">
      <Avatar name={name} src={settings?.avatar} size={60} />
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-muted-foreground">{format(now, 'EEEE, d MMMM')}</p>
        <h1 className="line-clamp-2 text-balance text-2xl font-bold leading-tight">
          {greeting.text}{greeting.emoji && <> <span aria-hidden="true">{greeting.emoji}</span></>}
        </h1>
      </div>
      <Link
        to="/profile"
        aria-label="Profile"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card transition-colors hover:bg-accent"
      >
        <UserRound size={22} />
      </Link>
    </header>
  )
}
