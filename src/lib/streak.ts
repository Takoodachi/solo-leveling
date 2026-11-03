import { db } from '@/db'
import { today } from './date'
import { differenceInCalendarDays, parseISO } from 'date-fns'

/**
 * A day counts as "logged" when food or a workout is logged that day, and the streak counts
 * logged days. It survives up to `STREAK_GRACE_DAYS` missed days in a row (November 2026, at the
 * owner's request, in place of weekly streak freezes): last logged on the 31st, a log on any of
 * the 1st to the 4th makes it one longer, while a first log on the 5th starts it again at 1.
 */
export const STREAK_GRACE_DAYS = 3

/** Whether a streak last logged on `lastLogDate` still stands on `day` (both YYYY-MM-DD). */
export function streakAlive(lastLogDate: string | null | undefined, day: string): boolean {
  return !!lastLogDate && differenceInCalendarDays(parseISO(day), parseISO(lastLogDate)) <= STREAK_GRACE_DAYS + 1
}

/** Count today as logged (called when food or a workout is logged). */
export async function updateStreak(): Promise<void> {
  const stats = await db.userStats.get(1)
  if (!stats) return

  const todayStr = today()
  if (stats.lastLogDate === todayStr) return // already logged today

  const currentStreak = streakAlive(stats.lastLogDate, todayStr) ? stats.currentStreak + 1 : 1
  await db.userStats.update(1, {
    currentStreak,
    longestStreak: Math.max(stats.longestStreak, currentStreak),
    lastLogDate: todayStr,
    updatedAt: Date.now(),
    syncPending: true,
  })
}
