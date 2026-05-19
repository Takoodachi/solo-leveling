import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { WorkoutWithSets, WorkoutSetWithExercise } from '@/types'

export function useWorkouts(limit?: number) {
  const workouts = useLiveQuery(
    () => db.workouts.orderBy('createdAt').reverse().limit(limit ?? 1000).toArray(),
    [limit]
  )
  return workouts ?? []
}

export async function getWorkoutWithSets(workoutUuid: string): Promise<WorkoutWithSets | undefined> {
  const workout = await db.workouts.get(workoutUuid)
  if (!workout) return undefined

  const sets = await db.workoutSets
    .where('workoutId')
    .equals(workoutUuid)
    .sortBy('setIndex')

  const exerciseIds = [...new Set(sets.map(s => s.exerciseId))]
  const exercises = await db.exercises.bulkGet(exerciseIds)
  const exerciseMap = new Map(exercises.flatMap(e => e ? [[e.uuid, e]] : []))

  const setsWithExercise: WorkoutSetWithExercise[] = sets.map(s => ({
    ...s,
    exercise: exerciseMap.get(s.exerciseId)!,
  }))

  return { ...workout, sets: setsWithExercise }
}
