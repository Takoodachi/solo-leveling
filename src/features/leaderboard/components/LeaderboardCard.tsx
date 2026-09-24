import { Link } from 'react-router-dom'
import { startOfWeek } from 'date-fns'
import { ChevronRight, Trophy } from 'lucide-react'
import { toDateStr } from '@/lib/date'
import { useNow } from '@/hooks/useNow'
import { boardOf, standings, type BoardKey } from '../boards'
import { useLeaderboardRows } from '../useLeaderboard'

/** Home / Profile entry point: where you stand among friends. */
export default function LeaderboardCard() {
  const now = useNow()
  const { signedIn, userId, rows } = useLeaderboardRows()
  const weekStart = toDateStr(startOfWeek(now, { weekStartsOn: 1 }))

  const place = (key: BoardKey) => {
    const list = standings(rows ?? [], boardOf(key), weekStart)
    const i = list.findIndex(r => r.entry.userId === userId && r.score != null)
    return i < 0 ? null : i + 1
  }
  const strength = place('strength')
  const week = place('week')
  const count = rows?.length ?? 0
  const friends = (rows ?? []).filter(r => r.userId !== userId).length

  let body: string
  if (!signedIn) body = 'Sign in to compare ranks with friends'
  else if (friends === 0) body = 'See how you stack up once friends join'
  else body = [strength && `#${strength} of ${count} in strength`, week && `#${week} this week`].filter(Boolean).join(' · ') || `${friends} friends sharing`

  return (
    <Link to="/leaderboard" className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-3xl bg-card p-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
        <Trophy size={22} className="text-primary" />
      </span>
      <span className="min-w-0">
        <span className="eyebrow block text-muted-foreground">Leaderboard</span>
        <span className="block truncate font-semibold">{body}</span>
      </span>
      <ChevronRight size={18} className="text-muted-foreground" />
    </Link>
  )
}
