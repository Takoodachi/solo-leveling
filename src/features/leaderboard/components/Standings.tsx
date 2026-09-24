import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import RankBadge from '@/features/ranks/components/RankBadge'
import { boardOf, profileLink, standings, type BoardKey } from '../boards'
import type { LeaderboardEntry } from '../types'
import Avatar from './Avatar'

interface Props {
  entries: LeaderboardEntry[]
  board: BoardKey
  weekStart: string
}

// Podium order left → right: 2nd, 1st, 3rd.
const PODIUM = [
  { place: 2, height: 'h-12', color: '#d3dae4', avatar: 48 },
  { place: 1, height: 'h-[4.5rem]', color: '#f5c84c', avatar: 60 },
  { place: 3, height: 'h-8', color: '#e0a07a', avatar: 48 },
]

/** Top three on a podium, everyone else in a list below. */
export default function Standings({ entries, board: key, weekStart }: Props) {
  const board = boardOf(key)
  const rows = standings(entries, board, weekStart)
  const podium = rows.filter(r => r.score != null).slice(0, 3)
  const rest = rows.slice(podium.length)

  return (
    <div className="flex flex-col gap-3">
      {podium.length > 0 ? (
        <div className="grid grid-cols-3 items-end gap-2 px-1">
          {PODIUM.map(p => {
            const r = podium[p.place - 1]
            if (!r) return <div key={p.place} />
            const tier = board.tier?.(r.entry.snapshot)
            return (
              <Link key={p.place} to={profileLink(r.entry)} className="flex min-w-0 flex-col items-center gap-1 text-center">
                <span className="relative">
                  <Avatar name={r.entry.name} me={r.entry.me} size={p.avatar} />
                  {tier && <RankBadge tier={tier} size={24} className="absolute -bottom-1 -right-2" />}
                </span>
                <span className="w-full truncate text-sm font-semibold">{r.entry.me ? 'You' : r.entry.name}</span>
                <span className="w-full truncate text-xs font-semibold tabular-nums">{board.value(r.entry.snapshot, weekStart)}</span>
                <span
                  className={cn('mt-1 flex w-full items-start justify-center rounded-t-2xl pt-1.5 font-heading text-lg font-bold', p.height)}
                  style={{ backgroundColor: `${p.color}26`, color: p.color }}
                >
                  {p.place}
                </span>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="rounded-3xl bg-card p-5 text-center text-sm text-muted-foreground">{board.empty}</p>
      )}

      {rest.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/5 rounded-3xl bg-card px-4">
          {rest.map((r, i) => {
            const tier = board.tier?.(r.entry.snapshot)
            return (
              <li key={r.entry.userId}>
                <Link to={profileLink(r.entry)} className="flex items-center gap-3 py-3">
                  <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted-foreground tabular-nums">
                    {r.score != null ? podium.length + i + 1 : '–'}
                  </span>
                  <Avatar name={r.entry.name} me={r.entry.me} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.entry.me ? `${r.entry.name} (you)` : r.entry.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{board.detail(r.entry.snapshot, weekStart)}</span>
                  </span>
                  {tier && <RankBadge tier={tier} size={28} />}
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{board.value(r.entry.snapshot, weekStart)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
