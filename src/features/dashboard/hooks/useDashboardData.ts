import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { today } from '@/lib/date'
import { useDailyLog } from '@/features/nutrition/hooks/useDailyLog'

export function useDashboardData() {
  const todayStr = today()
  const { totals: nutritionTotals, logs: nutritionLogs } = useDailyLog(todayStr)

  const targets = useLiveQuery(() => db.targets.get(1), [])
  const userStats = useLiveQuery(() => db.userStats.get(1), [])

  const todayWorkout = useLiveQuery(
    () => db.workouts.where('date').equals(todayStr).first(),
    [todayStr]
  )

  return {
    nutritionTotals,
    nutritionLogs,
    targets,
    userStats,
    todayWorkout,
    todayStr,
  }
}
