import { endOfWeek, subWeeks } from 'date-fns'
import { db } from '@/db'
import type { BodyMetric, Workout } from '@/types'
import { XP } from '@/lib/xp'
import { toDateStr } from '@/lib/date'
import { rankFor, type RankInfo } from './tiers'
import {
  MUSCLE_GROUPS, RANKED_EXERCISE_IDS, REGION_LABEL, groupOfRegion, groupOfStandard, standardFor,
  type MuscleGroup, type MuscleRegion, type Sex,
} from './standards'
import { bodyweightLookup, performanceFor, rateSet, thresholdsFor } from './scoring'
import { LEG_CREDIT, RUN_EXERCISE_IDS, equivalent5k, isRunExercise, rateRun, type RunRank } from './running'

export interface LiftRank {
  exerciseId: string
  name: string
  group: MuscleGroup
  regions: readonly MuscleRegion[]
  rank: RankInfo
  best: { weight?: number; reps?: number; duration?: number; date: string }
}

/** One muscle on the Bodygraph: ranked by the best lift that trains it. */
export interface RegionRank {
  key: MuscleRegion
  label: string
  group: MuscleGroup
  rank: RankInfo | null
  topLift: string | null
}

export interface GroupRank {
  key: MuscleGroup
  label: string
  /** The group's best region (= its best lift), so it never drops. */
  rank: RankInfo | null
  topLift: string | null
  regions: RegionRank[]
  /** Regions with a rank, e.g. 2 of 3. */
  ranked: number
}

export type RankStatus = 'ready' | 'needs-sex' | 'needs-weight'

export interface RanksSnapshot {
  status: RankStatus
  sex: Sex | null
  /** Latest weigh-in, used for live ratings and next-rank targets. */
  bodyKg: number | null
  lifts: LiftRank[] // strongest first
  regions: RegionRank[]
  groups: GroupRank[]
  overall: RankInfo | null
  /** Best run of 5 km+, as a 5K-equivalent. Separate from the strength overall. */
  running: RunRank | null
}

/** Overall rank needs this many ranked muscle groups. */
export const MIN_GROUPS_FOR_OVERALL = 3

interface RatedSet {
  exerciseId: string
  workout: Workout
  rating: number
  weight?: number
  reps?: number
  duration?: number
}

interface RatedRun {
  workout: Workout
  /** Running score: pace as a 5K-equivalent plus a distance bonus. */
  rating: number
  distanceKm: number
  duration: number
}

interface RankInputs {
  sex: Sex
  bodyKg: number
  rated: RatedSet[]
  runs: RatedRun[]
  names: Map<string, string>
}

type Loaded = { status: 'ready'; inputs: RankInputs } | { status: 'needs-sex' | 'needs-weight'; sex: Sex | null; bodyKg: number | null }

/** Rate every ranked set once, at the lifter's bodyweight on the day of that set. */
async function loadInputs(): Promise<Loaded> {
  const [settings, weights] = await Promise.all([db.settings.get(1), db.bodyMetrics.toArray()])
  const sex = settings?.sex ?? null
  const latest = weights.reduce<BodyMetric | undefined>((a, b) => (!a || b.date > a.date ? b : a), undefined)
  if (!sex) return { status: 'needs-sex', sex, bodyKg: latest?.weightKg ?? null }
  if (!latest) return { status: 'needs-weight', sex, bodyKg: null }

  const sets = await db.workoutSets.where('exerciseId').anyOf([...RANKED_EXERCISE_IDS, ...RUN_EXERCISE_IDS]).toArray()
  const workouts = await db.workouts.bulkGet([...new Set(sets.map(s => s.workoutId))])
  const workoutOf = new Map(workouts.flatMap(w => (w ? [[w.uuid, w] as const] : [])))
  const bodyOn = bodyweightLookup(weights)

  const rated: RatedSet[] = []
  const runs: RatedRun[] = []
  for (const s of sets) {
    const workout = workoutOf.get(s.workoutId)
    if (workout && isRunExercise(s.exerciseId)) {
      const rating = rateRun(sex, s.distanceKm, s.duration)
      if (rating > 0) runs.push({ workout, rating, distanceKm: s.distanceKm!, duration: s.duration! })
      continue
    }
    const std = standardFor(s.exerciseId)
    if (!workout || !std) continue
    const rating = rateSet(std, s, sex, bodyOn(workout.date) ?? latest.weightKg)
    if (rating > 0) rated.push({ exerciseId: s.exerciseId, workout, rating, weight: s.weight, reps: s.reps, duration: s.duration })
  }
  const exercises = await db.exercises.bulkGet([...new Set(rated.map(r => r.exerciseId))])
  const names = new Map(exercises.flatMap(e => (e ? [[e.uuid, e.name] as const] : [])))
  return { status: 'ready', inputs: { sex, bodyKg: latest.weightKg, rated, runs, names } }
}

/** Name shown as a leg muscle's top "lift" when running ranks it. */
export const RUNNING_SOURCE = 'Running'

function regionRanks(lifts: LiftRank[], legRating = 0): RegionRank[] {
  // Lifts are sorted strongest first, so the first match is the region's best.
  return (Object.keys(REGION_LABEL) as MuscleRegion[]).map(key => {
    const top = lifts.find(l => l.regions.includes(key))
    const base = { key, label: REGION_LABEL[key], group: groupOfRegion(key) }
    const fromRunning = legRating * (LEG_CREDIT[key] ?? 0)
    if (fromRunning >= 1 && fromRunning > (top?.rank.rating ?? 0)) return { ...base, rank: rankFor(fromRunning), topLift: RUNNING_SOURCE }
    return { ...base, rank: top?.rank ?? null, topLift: top?.name ?? null }
  })
}

function groupRanks(regions: RegionRank[]): GroupRank[] {
  return MUSCLE_GROUPS.map(g => {
    const rs = regions.filter(r => r.group === g.key)
    const top = rs.reduce<RegionRank | null>((a, b) => (b.rank && (!a?.rank || b.rank.rating > a.rank.rating) ? b : a), null)
    return { key: g.key, label: g.label, rank: top?.rank ?? null, topLift: top?.topLift ?? null, regions: rs, ranked: rs.filter(r => r.rank).length }
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

function emptySnapshot(status: RankStatus, sex: Sex | null, bodyKg: number | null): RanksSnapshot {
  const regions = regionRanks([])
  return { status, sex, bodyKg, lifts: [], regions, groups: groupRanks(regions), overall: null, running: null }
}

/** Ranks from the workouts `include` accepts. Ranks are floors: a lift keeps its best set. */
function buildSnapshot(inputs: RankInputs, include: (w: Workout) => boolean = () => true): RanksSnapshot {
  const best = new Map<string, RatedSet>()
  for (const r of inputs.rated) {
    if (!include(r.workout)) continue
    const current = best.get(r.exerciseId)
    if (!current || r.rating > current.rating) best.set(r.exerciseId, r)
  }
  const lifts: LiftRank[] = [...best.values()].flatMap(b => {
    const std = standardFor(b.exerciseId)
    const name = inputs.names.get(b.exerciseId)
    if (!std || !name) return []
    return [{
      exerciseId: b.exerciseId, name, group: groupOfStandard(std), regions: std.regions, rank: rankFor(b.rating),
      best: { weight: b.weight, reps: b.reps, duration: b.duration, date: b.workout.date },
    }]
  }).sort((a, b) => b.rank.rating - a.rank.rating)

  const runs = inputs.runs.filter(r => include(r.workout))
  const legRating = Math.max(0, ...runs.map(r => r.rating))
  const regions = regionRanks(lifts, legRating)
  const groups = groupRanks(regions)
  return { status: 'ready', sex: inputs.sex, bodyKg: inputs.bodyKg, lifts, regions, groups, overall: overallRank(groups), running: runningRank(runs) }
}

function runningRank(runs: RatedRun[]): RunRank | null {
  const best = runs.reduce<RatedRun | null>((a, r) => (!a || r.rating > a.rating ? r : a), null)
  if (!best) return null
  return {
    rank: rankFor(best.rating),
    best: { distanceKm: best.distanceKm, duration: best.duration, date: best.workout.date, equivalent5k: equivalent5k(best.distanceKm, best.duration)! },
  }
}

export async function computeRanks(include?: (w: Workout) => boolean): Promise<RanksSnapshot> {
  const loaded = await loadInputs()
  return loaded.status === 'ready' ? buildSnapshot(loaded.inputs, include) : emptySnapshot(loaded.status, loaded.sex, loaded.bodyKg)
}

export interface RankUp {
  /** Exercise id, "overall" or "running". */
  id: string
  name: string
  from: RankInfo | null
  to: RankInfo
}

/** Lifts (and the overall rank) that moved up a division thanks to this workout. */
export async function findRankUps(workout: Pick<Workout, 'uuid' | 'createdAt'>): Promise<RankUp[]> {
  const loaded = await loadInputs()
  if (loaded.status !== 'ready') return []
  const earlier = (w: Workout) => w.uuid !== workout.uuid && w.createdAt < workout.createdAt
  const before = buildSnapshot(loaded.inputs, earlier)
  const after = buildSnapshot(loaded.inputs, w => w.uuid === workout.uuid || earlier(w))

  const ups: RankUp[] = []
  if (after.overall && (!before.overall || after.overall.step > before.overall.step)) {
    ups.push({ id: 'overall', name: 'Overall', from: before.overall, to: after.overall })
  }
  if (after.running && (!before.running || after.running.rank.step > before.running.rank.step)) {
    ups.push({ id: 'running', name: 'Running', from: before.running?.rank ?? null, to: after.running.rank })
  }
  const previous = new Map(before.lifts.map(l => [l.exerciseId, l.rank]))
  for (const lift of after.lifts) {
    const from = previous.get(lift.exerciseId) ?? null
    if (!from || lift.rank.step > from.step) ups.push({ id: lift.exerciseId, name: lift.name, from, to: lift.rank })
  }
  return ups
}

export interface RankHistoryPoint {
  /** Last day of the week (Sunday). */
  date: string
  overall: number | null
  groups: Record<MuscleGroup, number | null>
  running: number | null
}

/** Weekly ratings (overall, per group and running) as they stood at the end of each of the last `weeks` weeks. */
export async function rankHistory(weeks: number): Promise<RankHistoryPoint[]> {
  const loaded = await loadInputs()
  if (loaded.status !== 'ready') return []
  const end = endOfWeek(new Date(), { weekStartsOn: 1 })
  return Array.from({ length: weeks }, (_, i) => {
    const date = toDateStr(subWeeks(end, weeks - 1 - i))
    const snap = buildSnapshot(loaded.inputs, w => w.date <= date)
    const groups = Object.fromEntries(snap.groups.map(g => [g.key, g.rank?.rating ?? null])) as Record<MuscleGroup, number | null>
    return { date, overall: snap.overall?.rating ?? null, groups, running: snap.running?.rank.rating ?? null }
  })
}

/** Bonus XP for rank-ups. A lift's first rank is celebrated but earns nothing (no XP for variety alone). */
export function rankUpXp(ups: RankUp[]): number {
  return ups.reduce((sum, u) => {
    if (u.id === 'overall') return sum + XP.OVERALL_RANK_UP * (u.from ? u.to.step - u.from.step : 1)
    return sum + (u.from ? XP.RANK_UP * (u.to.step - u.from.step) : 0)
  }, 0)
}

/** A lift's best set: "100 kg × 5", "12 reps" or "1:30 hold". */
export function describeBest(b: { weight?: number; reps?: number; duration?: number }): string {
  if (b.weight && b.reps) return `${b.weight} kg × ${b.reps}`
  if (b.duration && !b.reps) {
    const sec = Math.round(b.duration * 60)
    return sec < 60 ? `${sec} s hold` : `${clock(sec)} hold`
  }
  return `${b.reps ?? 0} reps`
}

function clock(seconds: number): string {
  const s = Math.ceil(seconds)
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** What it takes to reach the next division, e.g. "62.5 kg × 5", "9 reps" or "1:30 hold". */
export function nextRankTarget(exerciseId: string, rank: RankInfo, sex: Sex, bodyKg: number): string | null {
  const std = standardFor(exerciseId)
  if (!std || rank.nextAt == null) return null
  const perf = performanceFor(std, rank.nextAt, thresholdsFor(std, sex, bodyKg))
  switch (std.kind) {
    case 'load': return `${Math.ceil((perf / (1 + 5 / 30)) * 2) / 2} kg × 5`
    case 'hold': return `${clock(perf)} hold`
    case 'reps':
      if (perf <= 0) return std.assisted ? 'less assistance' : 'your first full rep'
      return `${Math.ceil(perf)} reps`
  }
}
