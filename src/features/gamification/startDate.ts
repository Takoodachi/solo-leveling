import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { toDateStr } from '@/lib/date'

/**
 * The day this person started (YYYY-MM-DD): the first day they logged food, a workout or a
 * check-in, or earned an achievement; `null` before any of that. It is read from what's logged
 * and stored nowhere, so every account already has one, the same on each of its devices.
 * Weigh-ins and steps don't count: old weigh-ins get typed in under their own dates, and the
 * Android app brings in two weeks of steps from before it was installed.
 */
export async function startDate(): Promise<string | null> {
  const [food, workout, checkin, achievement] = await Promise.all([
    db.foodLog.orderBy('date').first(),
    db.workouts.orderBy('date').first(),
    db.checkins.orderBy('date').first(),
    db.achievements.orderBy('unlockedAt').first(),
  ])
  const days = [food?.date, workout?.date, checkin?.date, achievement?.unlockedAt ? toDateStr(new Date(achievement.unlockedAt)) : undefined]
    .filter((day): day is string => !!day)
  return days.length > 0 ? days.reduce((first, day) => (day < first ? day : first)) : null
}

export const useStartDate = () => useLiveQuery(startDate, [])
