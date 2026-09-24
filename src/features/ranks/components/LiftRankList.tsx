import { formatShortDate } from '@/lib/date'
import { describeBest, nextRankTarget, type RanksSnapshot } from '../computeRanks'
import RankBadge from './RankBadge'
import RankProgress from './RankProgress'

/** Every ranked lift, strongest first, with what it takes to reach the next division. */
export default function LiftRankList({ ranks }: { ranks: RanksSnapshot }) {
  if (ranks.lifts.length === 0) {
    return <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">No ranked lifts yet. Finish a workout with a ranked exercise and it shows up here.</p>
  }

  return (
    <ul className="flex flex-col divide-y divide-white/5 rounded-3xl bg-card px-4">
      {ranks.lifts.map(l => {
        const target = ranks.sex && ranks.bodyKg ? nextRankTarget(l.exerciseId, l.rank, ranks.sex, ranks.bodyKg) : null
        return (
          <li key={l.exerciseId} className="flex items-center gap-3 py-3.5">
            <RankBadge tier={l.rank.tier.key} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-semibold">{l.name}</p>
                <p className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: l.rank.tier.color }}>{l.rank.label}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Best {describeBest(l.best)} · {formatShortDate(l.best.date)} · {l.rank.rating} pts
              </p>
              <RankProgress rank={l.rank} showLabel={false} className="mt-2" />
              {target && <p className="mt-1.5 text-xs text-muted-foreground">Next: <span className="text-foreground">{l.rank.nextLabel}</span> at ≈ {target}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
