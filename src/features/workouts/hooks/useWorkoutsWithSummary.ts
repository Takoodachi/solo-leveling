import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Workout } from '@/types'

export interface WorkoutSummary extends Workout {
  setCount: number
  exerciseNames: string[]
}

export function useWorkoutsWithSummary(limit?: number): WorkoutSummary[] {
  const data = useLiveQuery(async () => {
    const workouts = await db.workouts
      .orderBy('createdAt')
      .reverse()
      .limit(limit ?? 1000)
      .toArray()

    if (workouts.length === 0) return []

    const workoutIds = workouts.map(w => w.uuid)
    const sets = await db.workoutSets.where('workoutId').anyOf(workoutIds).toArray()
    if (sets.length === 0) {
      return workouts.map(w => ({ ...w, setCount: 0, exerciseNames: [] }))
    }

    const exerciseIds = [...new Set(sets.map(s => s.exerciseId))]
    const exercises = await db.exercises.bulkGet(exerciseIds)
    const exerciseName = new Map(
      exercises.flatMap(e => (e ? [[e.uuid, e.name]] : [])),
    )

    // Per-workout aggregation, preserving first-seen exercise order.
    interface Bucket { count: number; names: string[]; seen: Set<string> }
    const buckets = new Map<string, Bucket>()
    for (const id of workoutIds) {
      buckets.set(id, { count: 0, names: [], seen: new Set() })
    }
    // Sort sets by setIndex so the order on the card matches the order in the workout.
    const sortedSets = [...sets].sort((a, b) => a.setIndex - b.setIndex)
    for (const s of sortedSets) {
      const b = buckets.get(s.workoutId)
      if (!b) continue
      b.count += 1
      if (!b.seen.has(s.exerciseId)) {
        const name = exerciseName.get(s.exerciseId)
        if (name) {
          b.seen.add(s.exerciseId)
          b.names.push(name)
        }
      }
    }

    return workouts.map(w => {
      const b = buckets.get(w.uuid)!
      return { ...w, setCount: b.count, exerciseNames: b.names }
    })
  }, [limit])

  return data ?? []
}
