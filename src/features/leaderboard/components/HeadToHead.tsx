import { MUSCLE_GROUPS } from '@/features/ranks/standards'
import { rankFor } from '@/features/ranks/tiers'
import type { LeaderboardSnapshot } from '../types'

interface Props {
  me: LeaderboardSnapshot
  them: LeaderboardSnapshot
  name: string
}

/** Rating as a share of the bar (1000 = full). */
const width = (r: number | null) => `${Math.max(0, Math.min(1, (r ?? 0) / 1000)) * 100}%`

function Side({ rating, win, align }: { rating: number | null; win: boolean; align: 'left' | 'right' }) {
  const rank = rating ? rankFor(rating) : null
  return (
    <div className={align === 'left' ? 'flex flex-col items-end gap-1' : 'flex flex-col items-start gap-1'}>
      <span className="text-xs font-semibold tabular-nums" style={rank ? { color: rank.tier.color } : undefined}>
        {rank?.label ?? <span className="font-normal text-muted-foreground">–</span>}
      </span>
      <span className={align === 'left' ? 'flex h-1.5 w-full justify-end rounded-full bg-secondary' : 'flex h-1.5 w-full rounded-full bg-secondary'}>
        {rank && <span className="h-full rounded-full" style={{ width: width(rating), backgroundColor: rank.tier.color, opacity: win ? 1 : 0.4 }} />}
      </span>
    </div>
  )
}

/** You vs a friend: overall, each muscle group and running, bars growing out from the middle. */
export default function HeadToHead({ me, them, name }: Props) {
  const rows = [
    { key: 'overall', label: 'Overall', a: me.overall, b: them.overall },
    ...MUSCLE_GROUPS.map(g => ({ key: g.key, label: g.label, a: me.groups?.[g.key] ?? null, b: them.groups?.[g.key] ?? null })),
    { key: 'running', label: 'Running', a: me.running?.rating ?? null, b: them.running?.rating ?? null },
  ]
  const mine = rows.filter(r => (r.a ?? 0) > (r.b ?? 0)).length
  const theirs = rows.filter(r => (r.b ?? 0) > (r.a ?? 0)).length

  return (
    <div className="rounded-3xl bg-card p-4">
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
        <p className="text-right text-sm font-semibold">You</p>
        <p className="font-heading text-2xl font-bold tabular-nums">{mine} – {theirs}</p>
        <p className="truncate text-sm font-semibold">{name}</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {rows.map(r => (
          <li key={r.key} className="grid grid-cols-[1fr_4.5rem_1fr] items-end gap-2">
            <Side rating={r.a} win={(r.a ?? 0) >= (r.b ?? 0)} align="left" />
            <span className="pb-0.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{r.label}</span>
            <Side rating={r.b} win={(r.b ?? 0) >= (r.a ?? 0)} align="right" />
          </li>
        ))}
      </ul>
    </div>
  )
}
