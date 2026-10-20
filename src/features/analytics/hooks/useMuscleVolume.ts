import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, parseISO } from 'date-fns'
import { db } from '@/db'
import { toDateStr } from '@/lib/date'
import { muscleShares, setCredit, type VolumeMuscle } from '../volume'

export interface MuscleVolume {
  /** Weekly working sets per muscle (secondary muscles count half, sets under 4 reps half again). */
  sets: Map<VolumeMuscle, number>
  workouts: number
  /** Working sets logged (sets under 4 reps count half; cardio and stretching excluded). */
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
      const credit = setCredit(s)
      if (!share?.size || !credit) continue
      totalSets += credit
      for (const [m, n] of share) sets.set(m, (sets.get(m) ?? 0) + n * credit)
    }
    return { sets, workouts: workouts.length, totalSets }
  }, [weekStart])
}
