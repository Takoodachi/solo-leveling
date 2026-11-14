import type { Exercise, WeightUnit } from '@/types'
import { standardFor, type MuscleRegion, type Sex } from '@/features/ranks/standards'
import { performanceFor, thresholdsFor } from '@/features/ranks/scoring'
import { stepFor, targetFor, type ProgressHint } from './progression'
import { fromKg, isLb } from './units'

/**
 * A first weight for a lift that has never been logged (the tips have nothing to go on then), from
 * the lifter's own ranked lifts for the same muscle. The rank standards already say what each
 * lift is worth against the others: a lifter rated 520 on their chest lifts is, to a first guess,
 * a 520 on a chest lift they haven't tried, and the standard for that lift turns the rating back
 * into a weight. It takes the middle of the related lifts, not the best, and starts a little
 * under: a new movement isn't practised yet, and too light costs one set where too heavy costs
 * the session.
 */

/** A ranked lift of the lifter's, as the rank snapshot has it. */
export interface RankedLift {
  exerciseId: string
  name: string
  regions: readonly MuscleRegion[]
  rank: { rating: number }
}

export interface StartInput {
  exercise: Pick<Exercise, 'uuid' | 'name'>
  /** The routine's rep target, when the block came from a routine. */
  targetReps?: number
  unit?: WeightUnit
  sex: Sex
  bodyKg: number
  lifts: RankedLift[]
}

/** How much of the weight the related lifts point to is suggested. */
const START_SHARE = 0.9

export function suggestStart({ exercise, targetReps, unit, sex, bodyKg, lifts }: StartInput): ProgressHint | null {
  const std = standardFor(exercise.uuid)
  if (std?.kind !== 'load') return null
  const related = lifts.filter(l => l.exerciseId !== exercise.uuid && l.regions.includes(std.regions[0])).sort((a, b) => b.rank.rating - a.rank.rating)
  if (related.length === 0) return null
  // The middle one (the lower of two): one strong lift shouldn't set the bar for a new one
  const rating = related[Math.floor(related.length / 2)].rank.rating
  const reps = Math.max(1, Math.round(targetReps ?? targetFor(exercise.name)))
  const oneRepMax = performanceFor(std, rating, thresholdsFor(std, sex, bodyKg))
  const lb = isLb(unit)
  const weight = fromKg((oneRepMax / (1 + reps / 30)) * START_SHARE, unit)
  const step = stepFor(exercise.name, weight, lb)
  const start = Math.floor(weight / step) * step
  if (!(start > 0)) return null
  const u = lb ? 'lb' : 'kg'
  const from = related.slice(0, 2).map(l => l.name).join(' and ')
  return {
    kind: 'start',
    title: `Try about ${start} ${u}`,
    why: `Nothing logged for this yet. Going by your ${from}, about ${start} ${u} for ${reps} reps is a fair start. Let the first set tell you which way to move it.`,
    fill: { weight: start },
  }
}
