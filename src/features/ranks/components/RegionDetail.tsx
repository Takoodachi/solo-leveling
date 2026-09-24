import { useExerciseMap } from '@/features/workouts/hooks/useExercises'
import type { RegionRank } from '../computeRanks'
import { MUSCLE_GROUPS, exercisesForRegion } from '../standards'
import RankBadge from './RankBadge'
import RankProgress from './RankProgress'

/** The tapped muscle: its rank and the lift behind it, or (with `suggest`) which lifts would rank it. */
export default function RegionDetail({ region, suggest = true }: { region: RegionRank | null; suggest?: boolean }) {
  const exerciseMap = useExerciseMap()

  if (!region) {
    return <p className="rounded-3xl bg-card p-4 text-center text-sm text-muted-foreground">Tap a muscle to see its rank.</p>
  }

  const group = MUSCLE_GROUPS.find(g => g.key === region.group)?.label
  const suggestions = exercisesForRegion(region.key)
    .map(id => exerciseMap.get(id)?.name)
    .filter((n): n is string => !!n)
    .slice(0, 4)

  return (
    <div className="flex items-center gap-3 rounded-3xl bg-card p-4">
      <RankBadge tier={region.rank?.tier.key ?? 'wood'} size={52} locked={!region.rank} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{region.label}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{group}</span>
        </p>
        {region.rank ? (
          <>
            <p className="text-sm">
              <span className="font-semibold" style={{ color: region.rank.tier.color }}>{region.rank.label}</span>
              <span className="text-muted-foreground"> · {region.rank.rating} pts via {region.topLift}</span>
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
  )
}
