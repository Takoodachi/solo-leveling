import { Link } from 'react-router-dom'
import { useNow } from '@/hooks/useNow'
import RankBadge from '@/features/ranks/components/RankBadge'
import { rankFor } from '@/features/ranks/tiers'
import { ago, profileLink } from '../boards'
import type { LeaderboardEntry } from '../types'

const MAX = 8

/** Everyone's new bests from the last two weeks, newest first. */
export default function Highlights({ entries }: { entries: LeaderboardEntry[] }) {
  const now = useNow()
  const items = entries
    .flatMap(e => (e.snapshot.highlights ?? []).map(h => ({ ...h, who: e })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX)

  if (items.length === 0) {
    return <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">New bests from the last two weeks show up here.</p>
  }

  return (
    <ul className="flex flex-col divide-y divide-white/5 rounded-3xl bg-card px-4">
      {items.map((h, i) => {
        const rank = rankFor(h.rating)
        return (
          <li key={`${h.who.userId}-${h.name}-${i}`}>
            <Link to={profileLink(h.who)} className="flex items-center gap-3 py-3">
              <RankBadge tier={rank.tier.key} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  <b>{h.who.me ? 'You' : h.who.name}</b> · {h.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {h.detail} · <span style={{ color: rank.tier.color }}>{rank.label}</span>
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{ago(h.date, now)}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
