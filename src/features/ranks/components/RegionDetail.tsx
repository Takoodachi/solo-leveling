import { useEffect, useRef } from 'react'
import { useExerciseMap } from '@/features/workouts/hooks/useExercises'
import { formatShortDate } from '@/lib/date'
import { RUNNING_SOURCE, type RegionRank } from '../computeRanks'
import { MUSCLE_GROUPS, exercisesForRegion } from '../standards'
import RankBadge from './RankBadge'
import RankProgress from './RankProgress'
import { ink } from '@/lib/colors'

interface Props {
  region: RegionRank | null
  /** The set behind its rank and its day, when known (a friend shares only their top lifts). */
  best?: { set: string; date: string } | null
  /** Name the lifts that would rank a muscle not ranked yet (not on a friend's profile). */
  suggest?: boolean
}

/** The tapped muscle: its rank and the lift behind it with the set that earned it, or (with `suggest`) which lifts would rank it. */
export default function RegionDetail({ region, best, suggest = true }: Props) {
  const exerciseMap = useExerciseMap()
  const card = useRef<HTMLDivElement>(null)
  const key = region?.key
  // A muscle tapped on the figures above: bring the card up from below the screen's edge, where it
  // was out of sight. Never up to it, as for a tap in the list under it.
  useEffect(() => {
    const el = card.current
    if (key && el && el.getBoundingClientRect().bottom > window.innerHeight - 112) el.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [key])

  if (!region) {
    return <p className="rounded-3xl bg-card p-4 text-center text-sm text-muted-foreground">Tap a muscle to see its rank.</p>
  }

  const group = MUSCLE_GROUPS.find(g => g.key === region.group)?.label
  const suggestions = exercisesForRegion(region.key)
    .map(id => exerciseMap.get(id)?.name)
    .filter((n): n is string => !!n)
    .slice(0, 4)

  return (
    // scroll-mb-28: scrolled to, it stops clear of the bottom bar
    <div ref={card} className="scroll-mb-28 rounded-3xl bg-card p-4">
      <div className="flex items-center gap-3">
        <RankBadge tier={region.rank?.tier.key ?? 'wood'} division={region.rank?.division} size={52} locked={!region.rank} />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold">{region.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{group}</span>
          </p>
          {region.rank ? (
            <>
              <p className="text-sm">
                <span className="font-semibold" style={{ color: ink(region.rank.tier.color) }}>{region.rank.label}</span>
                <span className="text-muted-foreground"> · {region.rank.rating} pts</span>
              </p>
              <RankProgress rank={region.rank} className="mt-2" />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Unranked. {suggest && suggestions.length > 0 && <>Rank it with {suggestions.join(', ')}.</>}
            </p>
          )}
        </div>
      </div>
      {region.rank && region.topLift && (
        <div className="mt-3 flex items-end justify-between gap-3 border-t border-foreground/10 pt-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Ranked by</p>
            <p className="truncate text-sm font-semibold">{region.topLift}</p>
          </div>
          {best && (
            <div className="shrink-0 text-right">
              <p className="font-semibold tabular-nums">{best.set}</p>
              <p className="text-xs text-muted-foreground">{region.topLift === RUNNING_SOURCE ? 'Best run' : 'Best set'} · {formatShortDate(best.date)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
