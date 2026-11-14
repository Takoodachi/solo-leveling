import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Exercise, Workout, WorkoutSet, WorkoutWithSets, WorkoutSetWithExercise } from '@/types'
import { formatKm, formatSpeed, paceStyle, speedKmh } from '@/lib/cardio'
import { deleteSynced } from '@/lib/sync'
import { est1RM, totalVolume } from '@/lib/workoutMath'
import { trendOf } from '../progression'
import type { BlockHistory, LastSet, PastSession, Recent } from '../types'
import { overlap, preload, workDone } from '../fatigue'
import { exerciseUnit } from './useExerciseNote'

export interface WorkoutSummary extends Workout {
  setCount: number
  /** Sets that aren't cardio entries. */
  liftSetCount: number
  distanceKm: number
  exerciseNames: string[]
  volume: number
}

/** Past workouts, newest first; with `date`, that day's only. */
export function useWorkoutList(limit = 1000, date?: string): WorkoutSummary[] | undefined {
  return useLiveQuery(async () => {
    const workouts = date
      ? await db.workouts.where('date').equals(date).toArray()
      : await db.workouts.orderBy('createdAt').reverse().limit(limit).toArray()
    if (workouts.length === 0) return []

    const sets = await db.workoutSets.where('workoutId').anyOf(workouts.map(w => w.uuid)).toArray()
    const exercises = await db.exercises.bulkGet([...new Set(sets.map(s => s.exerciseId))])
    const nameOf = new Map(exercises.flatMap(e => (e ? [[e.uuid, e.name]] : [])))
    const cardioIds = new Set(exercises.flatMap(e => (e?.type === 'cardio' ? [e.uuid] : [])))

    const byWorkout = new Map<string, typeof sets>()
    for (const s of sets) byWorkout.set(s.workoutId, [...(byWorkout.get(s.workoutId) ?? []), s])

    return workouts.map(w => {
      const ws = (byWorkout.get(w.uuid) ?? []).sort((a, b) => a.setIndex - b.setIndex)
      const names: string[] = []
      for (const s of ws) {
        const n = nameOf.get(s.exerciseId)
        if (n && !names.includes(n)) names.push(n)
      }
      const liftSets = ws.filter(s => !cardioIds.has(s.exerciseId))
      const distanceKm = ws.reduce((sum, s) => sum + (cardioIds.has(s.exerciseId) ? (s.distanceKm ?? 0) : 0), 0)
      return { ...w, setCount: ws.length, liftSetCount: liftSets.length, distanceKm, exerciseNames: names, volume: totalVolume(liftSets) }
    })
  }, [limit, date])
}

export async function getWorkoutWithSets(uuid: string): Promise<WorkoutWithSets | null> {
  const workout = await db.workouts.get(uuid)
  if (!workout) return null
  const sets = await db.workoutSets.where('workoutId').equals(uuid).sortBy('setIndex')
  const exercises = await db.exercises.bulkGet([...new Set(sets.map(s => s.exerciseId))])
  const map = new Map(exercises.flatMap(e => (e ? [[e.uuid, e]] : [])))
  const withEx: WorkoutSetWithExercise[] = sets.flatMap(s => {
    const exercise = map.get(s.exerciseId)
    return exercise ? [{ ...s, exercise }] : []
  })
  return { ...workout, sets: withEx }
}

export function useWorkoutDetail(uuid: string | undefined): WorkoutWithSets | null | undefined {
  return useLiveQuery(() => (uuid ? getWorkoutWithSets(uuid) : Promise.resolve(null)), [uuid])
}

export async function deleteWorkout(uuid: string): Promise<void> {
  const setIds = await db.workoutSets.where('workoutId').equals(uuid).primaryKeys()
  await deleteSynced(db.workoutSets, 'workout_sets', setIds)
  await deleteSynced(db.workouts, 'workouts', [uuid])
}

/** Earlier workouts that included this exercise, newest first, with its sets in order. */
export async function pastSessions(exerciseId: string, beforeCreatedAt = Infinity, limit = 8): Promise<PastSession[]> {
  const sets = await db.workoutSets.where('exerciseId').equals(exerciseId).toArray()
  if (sets.length === 0) return []
  const workouts = (await db.workouts.bulkGet([...new Set(sets.map(s => s.workoutId))]))
    .filter((w): w is Workout => !!w && w.createdAt < beforeCreatedAt)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
  return workouts.map(w => ({
    at: w.createdAt,
    sets: sets
      .filter(s => s.workoutId === w.uuid)
      .sort((a, b) => a.setIndex - b.setIndex)
      .map(s => ({ weight: s.weight, reps: s.reps, duration: s.duration, distanceKm: s.distanceKm, rpe: s.rpe })),
  }))
}

/** Sets from the most recent earlier workout that included this exercise. */
export async function lastSessionSets(exerciseId: string, beforeCreatedAt = Infinity): Promise<LastSet[] | undefined> {
  return (await pastSessions(exerciseId, beforeCreatedAt, 1))[0]?.sets
}

const DAY_MS = 86_400_000

/** Sets' worth of work per exercise in some logged sets (a cardio entry by its minutes). */
async function workByExercise(sets: WorkoutSet[]): Promise<{ exercise: Exercise; sets: number }[]> {
  const ids = [...new Set(sets.map(s => s.exerciseId))]
  const exercises = await db.exercises.bulkGet(ids)
  return ids.flatMap((id, i) => {
    const ex = exercises[i]
    return ex ? [{ exercise: ex, sets: workDone(ex, sets.filter(s => s.exerciseId === id).map(s => s.duration ?? 0)) }] : []
  })
}

/**
 * The work this exercise's muscles got in the two days before `before`, in other workouts than
 * `skip`: a set from the last day counts whole, one from the day before it half (fatigue.ts).
 */
async function recentWork(exercise: Exercise, before: number, skip?: string): Promise<Recent> {
  const workouts = (await db.workouts.where('createdAt').between(before - 2 * DAY_MS, before, true, false).toArray()).filter(w => w.uuid !== skip)
  const by = new Map<string, number>()
  for (const w of workouts) {
    const work = await workByExercise(await db.workoutSets.where('workoutId').equals(w.uuid).toArray())
    // The exercise itself counts here, and whole: done the day before, it's what tires its muscles most
    const load = work.reduce((sum, e) => sum + e.sets * (e.exercise.uuid === exercise.uuid ? 1 : overlap(exercise, e.exercise)), 0)
    const name = w.name ?? 'a workout'
    if (load > 0) by.set(name, (by.get(name) ?? 0) + load * (before - w.createdAt <= DAY_MS ? 1 : 0.5))
  }
  return { sets: [...by.values()].reduce((a, b) => a + b, 0), after: [...by].sort((a, b) => b[1] - a[1]).map(([name]) => name) }
}

/**
 * What the last workout that had this exercise says about today's (fatigue.ts): what came before
 * it in that workout, and how rested its muscles were, beside how rested they are now.
 */
async function lastTime(exerciseId: string): Promise<Pick<BlockHistory, 'lastPreload' | 'recovery'>> {
  const exercise = await db.exercises.get(exerciseId)
  const mine = await db.workoutSets.where('exerciseId').equals(exerciseId).toArray()
  if (!exercise || mine.length === 0) return {}
  const last = (await db.workouts.bulkGet([...new Set(mine.map(s => s.workoutId))]))
    .filter((w): w is Workout => !!w)
    .sort((a, b) => b.createdAt - a.createdAt)[0]
  if (!last) return {}
  const all = await db.workoutSets.where('workoutId').equals(last.uuid).toArray()
  // Sets are saved as block × 100 + position, so the block number is the order
  const blockOf = (s: WorkoutSet) => Math.floor(s.setIndex / 100)
  const at = Math.min(...all.filter(s => s.exerciseId === exerciseId).map(blockOf))
  return {
    lastPreload: preload(exercise, await workByExercise(all.filter(s => blockOf(s) < at))),
    recovery: { today: await recentWork(exercise, Date.now()), last: await recentWork(exercise, last.createdAt, last.uuid) },
  }
}

/** What a new logger block needs from history: the "Previous" column, the progression facts, the unit it's logged in and what came before it last time. */
export async function blockHistory(exerciseId: string): Promise<BlockHistory> {
  const past = await pastSessions(exerciseId)
  return { lastSets: past[0]?.sets, trend: trendOf(past, Date.now()), unit: await exerciseUnit(exerciseId), ...(await lastTime(exerciseId)) }
}

export type BestKind = '1rm' | 'distance' | 'speed'

export interface NewBest {
  exerciseId: string
  exerciseName: string
  /** Missing on results saved before cardio bests existed (then it's an est. 1RM). */
  kind?: BestKind
  value: number
  previous: number
}

/** "est. 1RM 87.5 → 92 kg", "Longest 4.8 → 5.2 km", "Fastest 5:50 → 5:30 /km". */
export function describeBest(b: NewBest & { est1RM?: number }): { label: string; from: string; to: string } {
  const value = b.value ?? b.est1RM ?? 0
  switch (b.kind ?? '1rm') {
    case 'distance': return { label: 'Longest', from: formatKm(b.previous), to: formatKm(value) }
    case 'speed': return { label: 'Fastest', from: formatSpeed(b.exerciseId, b.previous), to: formatSpeed(b.exerciseId, value) }
    case '1rm': return { label: 'est. 1RM', from: String(b.previous), to: `${value} kg` }
  }
}

// Divided by the steps in a whole, not multiplied by the step: 773 × 0.1 is 77.30000000000001
const round = (n: number, step: number) => Math.round(n / step) / Math.round(1 / step)
const maxOf = (xs: number[]) => Math.max(0, ...xs)

/**
 * Bests this workout set against every earlier workout: est. 1RM for lifts,
 * longest distance and fastest pace for cardio. First-ever sessions don't count
 * (nothing to beat).
 */
export async function findNewBests(workout: WorkoutWithSets): Promise<NewBest[]> {
  const bests: NewBest[] = []
  for (const exerciseId of new Set(workout.sets.map(s => s.exerciseId))) {
    const sets = workout.sets.filter(s => s.exerciseId === exerciseId)
    const history = await db.workoutSets.where('exerciseId').equals(exerciseId).toArray()
    const earlierIds = new Set(
      (await db.workouts.bulkGet([...new Set(history.map(h => h.workoutId))]))
        .flatMap(w => (w && w.uuid !== workout.uuid && w.createdAt < workout.createdAt ? [w.uuid] : [])),
    )
    const earlier = history.filter(h => earlierIds.has(h.workoutId))
    const exerciseName = sets[0].exercise.name
    const add = (kind: BestKind, current: number, previous: number, step: number) => {
      if (previous > 0 && current > previous) bests.push({ exerciseId, exerciseName, kind, value: round(current, step), previous: round(previous, step) })
    }

    if (sets[0].exercise.type === 'cardio') {
      const distance = (xs: WorkoutSet[]) => maxOf(xs.map(s => s.distanceKm ?? 0))
      add('distance', distance(sets), distance(earlier), 0.01)
      if (paceStyle(exerciseId)) {
        // Pace only counts over a meaningful distance, so a 200 m jog isn't a "record".
        const minKm = paceStyle(exerciseId) === 'per-100m' ? 0.2 : 1
        const speed = (xs: WorkoutSet[]) => maxOf(xs.filter(s => (s.distanceKm ?? 0) >= minKm).map(s => speedKmh(s) ?? 0))
        add('speed', speed(sets), speed(earlier), 0.001)
      }
    } else {
      const oneRm = (xs: WorkoutSet[]) => maxOf(xs.filter(s => s.weight && s.reps).map(s => est1RM(s.weight!, s.reps!)))
      add('1rm', oneRm(sets), oneRm(earlier), 0.1)
    }
  }
  return bests
}
