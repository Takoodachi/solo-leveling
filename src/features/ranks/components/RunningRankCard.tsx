import { formatShortDate } from '@/lib/date'
import { formatKm } from '@/lib/cardio'
import type { Sex } from '../standards'
import { TIERS } from '../tiers'
import { MIN_RUN_KM, fiveKTimeFor, formatRunTime, timeOver, type RunRank } from '../running'
import RankBadge from './RankBadge'
import RankProgress from './RankProgress'

/** Running rank (best run as a 5K-equivalent), what the next division takes, and the 5K time for each tier. */
export default function RunningRankCard({ running, sex }: { running: RunRank | null; sex: Sex }) {
  const rank = running?.rank
  const next = rank?.nextAt != null ? fiveKTimeFor(sex, rank.nextAt) : null

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-card p-4">
      <div className="flex items-center gap-3">
        <RankBadge tier={rank?.tier.key ?? 'wood'} size={56} locked={!rank} />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">Running</span>
            {rank && <span className="shrink-0 text-sm font-semibold" style={{ color: rank.tier.color }}>{rank.label}</span>}
          </p>
          {running && rank ? (
            <>
              <p className="text-xs text-muted-foreground">
                Best {formatKm(running.best.distanceKm)} in {formatRunTime(running.best.duration)} · {formatShortDate(running.best.date)}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                Worth a <span className="text-foreground">{formatRunTime(running.best.equivalent5k)}</span> 5K · {rank.rating} pts
              </p>
              <RankProgress rank={rank} showLabel={false} className="mt-2" />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Log a run of {Math.round(MIN_RUN_KM)} km or more, with its distance, to get ranked.</p>
          )}
        </div>
      </div>

      {rank && next != null && (
        <p className="text-xs text-muted-foreground">
          Next: <span className="text-foreground">{rank.nextLabel}</span> at a {formatRunTime(next)} 5K, or {formatRunTime(timeOver(10, next))} for 10K
        </p>
      )}

      {/* The 5K time where each tier starts */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TIERS.slice(1).map(t => {
          const reached = !!rank && rank.rating >= t.min
          return (
            <div key={t.key} className="flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-2xl bg-secondary/60 py-2">
              <RankBadge tier={t.key} size={30} locked={!reached} />
              <span className="text-[10px] font-bold uppercase" style={{ color: t.color }}>{t.name}</span>
              <span className="text-xs tabular-nums">{formatRunTime(fiveKTimeFor(sex, t.min))}</span>
            </div>
          )
        })}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        5K time where each tier starts. Longer runs count too: they’re converted to the 5K they’re worth, so holding a pace for longer ranks higher.
      </p>
    </div>
  )
}
