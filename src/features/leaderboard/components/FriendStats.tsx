import { formatShortDate } from '@/lib/date'
import RankBadge from '@/features/ranks/components/RankBadge'
import { rankFor } from '@/features/ranks/tiers'
import type { LeaderboardSnapshot } from '../types'

/** Their strongest ranked lifts. */
export function TopLifts({ s }: { s: LeaderboardSnapshot }) {
  if (!s.lifts?.length) return <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">No ranked lifts yet.</p>
  return (
    <ul className="flex flex-col divide-y divide-white/5 rounded-3xl bg-card px-4">
      {s.lifts.map(l => {
        const rank = rankFor(l.rating)
        return (
          <li key={l.name} className="flex items-center gap-3 py-3">
            <RankBadge tier={rank.tier.key} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{l.name}</span>
              <span className="block text-xs text-muted-foreground">{l.best} · {formatShortDate(l.date)}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold" style={{ color: rank.tier.color }}>{rank.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** This week's totals, or zeros once a new week starts without training. */
export function WeekTiles({ s, weekStart }: { s: LeaderboardSnapshot; weekStart: string }) {
  const w = s.week?.start === weekStart ? s.week : null
  const tiles = [
    { label: 'Workouts', value: w?.workouts ?? 0 },
    { label: 'Sets', value: w?.sets ?? 0 },
    { label: 'Minutes', value: w?.minutes ?? 0 },
    { label: 'Run km', value: w?.runKm ?? 0 },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {tiles.map(t => (
        <div key={t.label} className="flex flex-col items-center rounded-2xl bg-card py-3">
          <span className="font-heading text-xl font-bold tabular-nums">{t.value}</span>
          <span className="text-[11px] text-muted-foreground">{t.label}</span>
        </div>
      ))}
    </div>
  )
}
