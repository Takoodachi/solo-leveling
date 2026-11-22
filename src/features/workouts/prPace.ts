import { est1RM } from '@/lib/workoutMath'
import { standardFor } from '@/features/ranks/standards'
import { rateSet } from '@/features/ranks/scoring'
import type { RankContext } from '@/features/ranks/liveRank'
import type { RankInfo } from '@/features/ranks/tiers'

/**
 * The live PR line (November 2026, at the owner's request): under the next set, how many reps at
 * its weight would make a new best (an est. 1RM past every earlier set, as the summary's new bests
 * count it) and, when that's close too, the next division of the lift's rank. Only within reach of
 * what the set is set up for, so it's a goal for this set and not a push past the plan on every one.
 */

/** Past this many reps, an est. 1RM measures endurance more than strength (the ranks cap it here too). */
const MAX_REPS = 20
/** How far past the reps the set is set up for a target still shows. */
const REACH = 2
/** With nothing to say what the set is set up for. */
const DEFAULT_LIMIT = 12

/** The fewest reps at `kg` whose est. 1RM beats `best`; null past 20 or with nothing to beat. */
export function repsToBeat(kg: number, best: number): number | null {
  if (kg <= 0 || best <= 0) return null
  for (let reps = 1; reps <= MAX_REPS; reps++) if (est1RM(kg, reps) > best) return reps
  return null
}

/** The fewest reps at `kg` (added weight on a bodyweight move) that reach the lift's next division. */
export function repsToRank(exerciseId: string, kg: number, rank: RankInfo, ctx: RankContext): number | null {
  const std = standardFor(exerciseId)
  if (!std || std.kind === 'hold' || rank.nextAt == null) return null
  for (let reps = 1; reps <= MAX_REPS; reps++) {
    if (rateSet(std, { weight: kg > 0 ? kg : undefined, reps }, ctx.sex, ctx.bodyKg) >= rank.nextAt) return reps
  }
  return null
}

export interface PaceInput {
  exerciseId: string
  /** The next set's weight in kg (0 with none: at bodyweight, or not typed yet). */
  kg: number
  /** The reps it's set up for: typed, last time's at its place, or the routine's. */
  planned?: number
  /** The best est. 1RM so far, today's sets included; 0 with nothing to beat. */
  best: number
  /** The lift's rank so far, today's sets included (none on a lift without a standard). */
  rank?: RankInfo
  ctx: RankContext | null
  /** Assisted: est. 1RM of the help means nothing, so only the rank counts. */
  assisted?: boolean
}

/** "9 reps = new best · 11 = Diamond I", or null when neither is within reach. */
export function prPace({ exerciseId, kg, planned, best, rank, ctx, assisted }: PaceInput): string | null {
  const limit = planned != null && planned > 0 ? planned + REACH : DEFAULT_LIMIT
  const near = (reps: number | null) => (reps != null && reps <= limit ? reps : null)
  const goals: [number, string][] = []
  const forBest = assisted ? null : near(repsToBeat(kg, best))
  if (forBest != null) goals.push([forBest, 'new best'])
  const forRank = rank?.nextLabel && ctx ? near(repsToRank(exerciseId, kg, rank, ctx)) : null
  if (forRank != null && rank?.nextLabel) goals.push([forRank, rank.nextLabel])
  if (goals.length === 0) return null
  goals.sort((a, b) => a[0] - b[0])
  const reps = (n: number) => `${n} ${n === 1 ? 'rep' : 'reps'}`
  if (goals.length === 2 && goals[0][0] === goals[1][0]) return `${reps(goals[0][0])} = ${goals[0][1]} and ${goals[1][1]}`
  return goals.map(([n, what], i) => `${i === 0 ? reps(n) : n} = ${what}`).join(' · ')
}
