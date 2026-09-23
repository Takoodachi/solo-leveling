import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, parseISO } from 'date-fns'
import { db } from '@/db'
import { toDateStr } from '@/lib/date'
import { muscleShares, type VolumeMuscle } from '../volume'

export interface MuscleVolume {
  /** Weekly sets per muscle (secondary muscles count half). */
  sets: Map<VolumeMuscle, number>
  workouts: number
  /** Logged working sets (cardio and stretching excluded). */
  totalSets: number
}

/** Set volume per muscle for the Mon–Sun week starting `weekStart`. */
export function useMuscleVolume(weekStart: string): MuscleVolume | undefined {
  return useLiveQuery(async () => {
    const weekEnd = toDateStr(addDays(parseISO(weekStart), 6))
    const workouts = await db.workouts.where('date').between(weekStart, weekEnd, true, true).toArray()
    const logged = workouts.length ? await db.workoutSets.where('workoutId').anyOf(workouts.map(w => w.uuid)).toArray() : []
    const exercises = await db.exercises.bulkGet([...new Set(logged.map(s => s.exerciseId))])
    const shares = new Map(exercises.flatMap(e => (e ? [[e.uuid, muscleShares(e)] as const] : [])))

    const sets = new Map<VolumeMuscle, number>()
    let totalSets = 0
    for (const s of logged) {
      const share = shares.get(s.exerciseId)
      if (!share?.size) continue
      totalSets += 1
      for (const [m, n] of share) sets.set(m, (sets.get(m) ?? 0) + n)
    }
    return { sets, workouts: workouts.length, totalSets }
  }, [weekStart])
}
