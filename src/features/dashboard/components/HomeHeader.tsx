import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Settings } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { useNow } from '@/hooks/useNow'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useAuthStore } from '@/features/auth/authStore'

export default function HomeHeader() {
  const { settings } = useSettings()
  const email = useAuthStore(s => s.session?.user.email)
  const now = useNow()
  const name = settings?.displayName?.trim() || email?.split('@')[0] || ''
  const firstName = name.split(/\s+/)[0]

  return (
    <header className="flex items-center gap-4 pt-3">
      <Avatar name={name} size={60} />
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-muted-foreground">{format(now, 'EEEE, d MMMM')}</p>
        <h1 className="truncate text-[28px] font-bold leading-tight">
          Hi{firstName ? `, ${firstName}` : ''} <span aria-hidden="true">👋</span>
        </h1>
      </div>
      <Link
        to="/profile"
        aria-label="Profile and settings"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card transition-colors hover:bg-accent"
      >
        <Settings size={22} />
      </Link>
    </header>
  )
}
