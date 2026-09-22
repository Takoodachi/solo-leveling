import { db } from '@/db'
import type { BodyMetric, Workout } from '@/types'
import { XP } from '@/lib/xp'
import { rankFor, type RankInfo } from './tiers'
import { MUSCLE_GROUPS, RANKED_EXERCISE_IDS, standardFor, type MuscleGroup, type Sex } from './standards'
import { bodyweightLookup, performanceFor, rateSet, thresholdsFor } from './scoring'

export interface LiftRank {
  exerciseId: string
  name: string
  group: MuscleGroup
  rank: RankInfo
  best: { weight?: number; reps?: number; date: string }
}

export interface GroupRank {
  key: MuscleGroup
  label: string
  rank: RankInfo | null
  topLift: string | null
}

export type RankStatus = 'ready' | 'needs-sex' | 'needs-weight'

export interface RanksSnapshot {
  status: RankStatus
  sex: Sex | null
  /** Latest weigh-in, used for live ratings and next-rank targets. */
  bodyKg: number | null
  lifts: LiftRank[] // strongest first
  groups: GroupRank[]
  overall: RankInfo | null
}

/** Overall rank needs this many ranked muscle groups. */
export const MIN_GROUPS_FOR_OVERALL = 3

/**
 * Every ranked lift's best set, rated at the lifter's bodyweight on the day of
 * that set. Ranks are floors: they never drop. `include` limits which workouts
 * count (used to compare before/after a session).
 */
export async function computeRanks(include: (w: Workout) => boolean = () => true): Promise<RanksSnapshot> {
  const [settings, weights] = await Promise.all([db.settings.get(1), db.bodyMetrics.toArray()])
  const sex = settings?.sex ?? null
  const latest = weights.reduce<BodyMetric | undefined>((a, b) => (!a || b.date > a.date ? b : a), undefined)
  const empty = { sex, bodyKg: latest?.weightKg ?? null, lifts: [], groups: groupRanks([]), overall: null }
  if (!sex) return { ...empty, status: 'needs-sex' }
  if (!latest) return { ...empty, status: 'needs-weight' }

  const sets = await db.workoutSets.where('exerciseId').anyOf([...RANKED_EXERCISE_IDS]).toArray()
  const workouts = await db.workouts.bulkGet([...new Set(sets.map(s => s.workoutId))])
  const dateOf = new Map(workouts.flatMap(w => (w && include(w) ? [[w.uuid, w.date] as const] : [])))
  const bodyOn = bodyweightLookup(weights)

  const best = new Map<string, { rating: number; weight?: number; reps?: number; date: string }>()
  for (const s of sets) {
    const date = dateOf.get(s.workoutId)
    const std = standardFor(s.exerciseId)
    if (!date || !std) continue
    const rating = rateSet(std, s, sex, bodyOn(date) ?? latest.weightKg)
    const current = best.get(s.exerciseId)
    if (rating > 0 && (!current || rating > current.rating)) best.set(s.exerciseId, { rating, weight: s.weight, reps: s.reps, date })
  }

  const exercises = await db.exercises.bulkGet([...best.keys()])
  const lifts: LiftRank[] = exercises.flatMap(ex => {
    const b = ex && best.get(ex.uuid)
    const std = ex && standardFor(ex.uuid)
    if (!ex || !b || !std) return []
    return [{ exerciseId: ex.uuid, name: ex.name, group: std.group, rank: rankFor(b.rating), best: { weight: b.weight, reps: b.reps, date: b.date } }]
  }).sort((a, b) => b.rank.rating - a.rank.rating)

  const groups = groupRanks(lifts)
  return { status: 'ready', sex, bodyKg: latest.weightKg, lifts, groups, overall: overallRank(groups) }
}

function groupRanks(lifts: LiftRank[]): GroupRank[] {
  // Lifts are sorted strongest first, so the first match is the group's best.
  return MUSCLE_GROUPS.map(g => {
    const top = lifts.find(l => l.group === g.key)
    return { key: g.key, label: g.label, rank: top?.rank ?? null, topLift: top?.name ?? null }
  })
}

/** Weighted mean of the ranked muscle groups (legs and back count most). */
function overallRank(groups: GroupRank[]): RankInfo | null {
  let sum = 0
  let weight = 0
  for (const g of groups) {
    if (!g.rank) continue
    const w = MUSCLE_GROUPS.find(m => m.key === g.key)?.weight ?? 0
    sum += g.rank.rating * w
    weight += w
  }
  const ranked = groups.filter(g => g.rank).length
  return ranked >= MIN_GROUPS_FOR_OVERALL && weight > 0 ? rankFor(sum / weight) : null
}

export interface RankUp {
  /** Exercise id, or "overall". */
  id: string
  name: string
  from: RankInfo | null
  to: RankInfo
}

/** Lifts (and the overall rank) that moved up a division thanks to this workout. */
export async function findRankUps(workout: Pick<Workout, 'uuid' | 'createdAt'>): Promise<RankUp[]> {
  const earlier = (w: Workout) => w.uuid !== workout.uuid && w.createdAt < workout.createdAt
  const [before, after] = await Promise.all([
    computeRanks(earlier),
    computeRanks(w => w.uuid === workout.uuid || earlier(w)),
  ])
  if (after.status !== 'ready') return []

  const ups: RankUp[] = []
  if (after.overall && (!before.overall || after.overall.step > before.overall.step)) {
    ups.push({ id: 'overall', name: 'Overall', from: before.overall, to: after.overall })
  }
  const previous = new Map(before.lifts.map(l => [l.exerciseId, l.rank]))
  for (const lift of after.lifts) {
    const from = previous.get(lift.exerciseId) ?? null
    if (!from || lift.rank.step > from.step) ups.push({ id: lift.exerciseId, name: lift.name, from, to: lift.rank })
  }
  return ups
}

/** Bonus XP for rank-ups. A lift's first rank is celebrated but earns nothing (no XP for variety alone). */
export function rankUpXp(ups: RankUp[]): number {
  return ups.reduce((sum, u) => {
    if (u.id === 'overall') return sum + XP.OVERALL_RANK_UP * (u.from ? u.to.step - u.from.step : 1)
    return sum + (u.from ? XP.RANK_UP * (u.to.step - u.from.step) : 0)
  }, 0)
}

/** What it takes to reach the next division, e.g. "62.5 kg × 5" or "9 reps". */
export function nextRankTarget(exerciseId: string, rank: RankInfo, sex: Sex, bodyKg: number): string | null {
  const std = standardFor(exerciseId)
  if (!std || rank.nextAt == null) return null
  const perf = performanceFor(std, rank.nextAt, thresholdsFor(std, sex, bodyKg))
  if (std.kind === 'load') {
    const forFive = Math.ceil((perf / (1 + 5 / 30)) * 2) / 2
    return `${forFive} kg × 5`
  }
  if (perf <= 0) return std.assisted ? 'less assistance' : 'your first full rep'
  return `${Math.ceil(perf)} reps`
}
