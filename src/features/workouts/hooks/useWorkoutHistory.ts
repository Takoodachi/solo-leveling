import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Workout, WorkoutWithSets, WorkoutSetWithExercise } from '@/types'
import { deleteSynced } from '@/lib/sync'
import { est1RM, totalVolume } from '@/lib/workoutMath'
import type { LastSet } from '../types'

export interface WorkoutSummary extends Workout {
  setCount: number
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

    const byWorkout = new Map<string, typeof sets>()
    for (const s of sets) byWorkout.set(s.workoutId, [...(byWorkout.get(s.workoutId) ?? []), s])

    return workouts.map(w => {
      const ws = (byWorkout.get(w.uuid) ?? []).sort((a, b) => a.setIndex - b.setIndex)
      const names: string[] = []
      for (const s of ws) {
        const n = nameOf.get(s.exerciseId)
        if (n && !names.includes(n)) names.push(n)
      }
      return { ...w, setCount: ws.length, exerciseNames: names, volume: totalVolume(ws) }
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
    .map(s => ({ weight: s.weight, reps: s.reps, duration: s.duration, distanceKm: s.distanceKm }))
}

export interface NewBest {
  exerciseId: string
  exerciseName: string
  est1RM: number
  previous: number
}

/**
 * Exercises in this workout whose best estimated 1RM beats every earlier
 * workout. First-ever sessions don't count (nothing to beat).
 */
export async function findNewBests(workout: WorkoutWithSets): Promise<NewBest[]> {
  const byExercise = new Map<string, WorkoutSetWithExercise[]>()
  for (const s of workout.sets) {
    if (s.weight && s.reps) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s])
  }
  const bests: NewBest[] = []
  for (const [exerciseId, sets] of byExercise) {
    const current = Math.max(...sets.map(s => est1RM(s.weight!, s.reps!)))
    const history = await db.workoutSets.where('exerciseId').equals(exerciseId).toArray()
    const earlierWorkoutIds = new Set(
      (await db.workouts.bulkGet([...new Set(history.map(h => h.workoutId))]))
        .flatMap(w => (w && w.uuid !== workout.uuid && w.createdAt < workout.createdAt ? [w.uuid] : [])),
    )
    const previous = Math.max(0, ...history
      .filter(h => earlierWorkoutIds.has(h.workoutId) && h.weight && h.reps)
      .map(h => est1RM(h.weight!, h.reps!)))
    if (previous > 0 && current > previous) {
      bests.push({ exerciseId, exerciseName: sets[0].exercise.name, est1RM: Math.round(current * 10) / 10, previous: Math.round(previous * 10) / 10 })
    }
  }
  return bests
}
