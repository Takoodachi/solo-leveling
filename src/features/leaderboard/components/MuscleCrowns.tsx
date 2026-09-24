import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { MUSCLE_GROUPS, type MuscleGroup } from '@/features/ranks/standards'
import { rankFor } from '@/features/ranks/tiers'
import { profileLink } from '../boards'
import type { LeaderboardEntry } from '../types'

type Territory = MuscleGroup | 'running'
const TERRITORIES: { key: Territory; label: string }[] = [
  ...MUSCLE_GROUPS.map(g => ({ key: g.key as Territory, label: g.label })),
  { key: 'running', label: 'Running' },
]

const ratingOf = (e: LeaderboardEntry, key: Territory) =>
  key === 'running' ? e.snapshot.running?.rating ?? 0 : e.snapshot.groups?.[key] ?? 0

/** Who holds the highest rank in each muscle group (and running) among friends. */
export default function MuscleCrowns({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {TERRITORIES.map(t => {
        const holder = entries.reduce<LeaderboardEntry | null>(
          (best, e) => (ratingOf(e, t.key) > (best ? ratingOf(best, t.key) : 0) ? e : best),
          null,
        )
        const rank = holder ? rankFor(ratingOf(holder, t.key)) : null
        const body = (
          <>
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.label}</span>
              <Crown size={16} style={rank ? { color: rank.tier.color } : undefined} className={rank ? undefined : 'text-muted-foreground/40'} />
            </span>
            <span className="mt-1 block truncate font-semibold">{holder ? (holder.me ? 'You' : holder.name) : 'Unclaimed'}</span>
            {rank ? (
              <span className="block text-xs font-semibold" style={{ color: rank.tier.color }}>{rank.label}</span>
            ) : (
              <span className="block text-xs text-muted-foreground">Nobody ranked yet</span>
            )}
          </>
        )
        return (
          <li key={t.key}>
            {holder ? (
              <Link to={profileLink(holder)} className="block h-full rounded-2xl bg-card p-3">{body}</Link>
            ) : (
              <div className="h-full rounded-2xl bg-card p-3">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
