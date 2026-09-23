import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Workout, WorkoutSet, WorkoutWithSets, WorkoutSetWithExercise } from '@/types'
import { formatKm, formatSpeed, paceStyle, speedKmh } from '@/lib/cardio'
import { deleteSynced } from '@/lib/sync'
import { est1RM, totalVolume } from '@/lib/workoutMath'
import type { LastSet } from '../types'

export interface WorkoutSummary extends Workout {
  setCount: number
  /** Sets that aren't cardio entries. */
  liftSetCount: number
  distanceKm: number
  exerciseNames: string[]
  volume: number
}

export function useWorkoutList(limit = 1000): WorkoutSummary[] | undefined {
  return useLiveQuery(async () => {
    const workouts = await db.workouts.orderBy('createdAt').reverse().limit(limit).toArray()
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
  }, [limit])
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

/** Sets from the most recent earlier workout that included this exercise. */
export async function lastSessionSets(exerciseId: string, beforeCreatedAt = Infinity): Promise<LastSet[] | undefined> {
  const sets = await db.workoutSets.where('exerciseId').equals(exerciseId).toArray()
  if (sets.length === 0) return undefined
  const workouts = await db.workouts.bulkGet([...new Set(sets.map(s => s.workoutId))])
  let latest: Workout | undefined
  for (const w of workouts) {
    if (w && w.createdAt < beforeCreatedAt && (!latest || w.createdAt > latest.createdAt)) latest = w
  }
  if (!latest) return undefined
  const latestId = latest.uuid
  return sets
    .filter(s => s.workoutId === latestId)
    .sort((a, b) => a.setIndex - b.setIndex)
    .map(s => ({ weight: s.weight, reps: s.reps, duration: s.duration, distanceKm: s.distanceKm, rpe: s.rpe }))
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

const round = (n: number, step: number) => Math.round(n / step) * step
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
