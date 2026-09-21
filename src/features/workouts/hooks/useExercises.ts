import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Exercise, Routine } from '@/types'
import { requestSync } from '@/lib/sync'
import { routineMinutes } from '@/lib/workoutMath'

export async function createCustomExercise(
  data: Omit<Exercise, 'uuid' | 'isCustom' | 'updatedAt' | 'syncPending'>,
): Promise<Exercise> {
  const exercise: Exercise = {
    ...data,
    uuid: crypto.randomUUID(),
    isCustom: true,
    updatedAt: Date.now(),
    syncPending: true,
  }
  await db.exercises.add(exercise)
  requestSync()
  return exercise
}

export function useExercises() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])

  function searchExercises(query: string): Exercise[] {
    if (!exercises) return []
    const q = query.toLowerCase().trim()
    if (!q) return exercises
    return exercises.filter(
      e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) ||
        e.muscles?.some(m => m.toLowerCase().includes(q)),
    )
  }

  return { exercises: exercises ?? [], searchExercises, createCustomExercise }
}

/** Map of exercise id → exercise, for rendering routines and history. */
export function useExerciseMap(): Map<string, Exercise> {
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  return useMemo(() => new Map((exercises ?? []).map(e => [e.uuid, e])), [exercises])
}

/** Estimated minutes for a routine (its saved estimate, else computed from sets and rest). */
export function useRoutineMinutes(): (routine: Pick<Routine, 'exercises' | 'estDurationMin'>) => number {
  const map = useExerciseMap()
  return routine => routine.estDurationMin || routineMinutes(routine.exercises, id => map.get(id))
}
