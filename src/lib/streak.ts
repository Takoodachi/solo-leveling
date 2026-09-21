import { db } from '@/db'
import { today } from './date'
import { requestSync } from './sync'
import { subDays, format, parseISO, getISOWeek, getISOWeekYear } from 'date-fns'

/** A day counts as "logged" when food or a workout is logged that day. */
export async function updateStreak(): Promise<void> {
  const stats = await db.userStats.get(1)
  if (!stats) return

  const todayStr = today()
  if (stats.lastLogDate === todayStr) return // already logged today

  const yesterdayStr = format(subDays(parseISO(todayStr), 1), 'yyyy-MM-dd')
  const wasYesterday = stats.lastLogDate === yesterdayStr

  let { currentStreak, longestStreak, streakFreezes } = stats

  if (wasYesterday) {
    currentStreak += 1
  } else if (stats.lastLogDate == null) {
    currentStreak = 1
  } else {
    // Check if we can consume a freeze
    if (streakFreezes > 0) {
      streakFreezes -= 1
      currentStreak += 1
    } else {
      currentStreak = 1
    }
  }

  if (currentStreak > longestStreak) longestStreak = currentStreak

  await db.userStats.update(1, {
    currentStreak,
    longestStreak,
    lastLogDate: todayStr,
    streakFreezes,
    updatedAt: Date.now(),
    syncPending: true,
  })
}

/**
 * Grant one streak freeze per ISO week (max 2 banked). The granted week is
 * stored on userStats (synced), so it's granted once per week across devices.
 * Call after the initial sync so a fresh device doesn't grant on stale stats.
 */
export async function grantWeeklyStreakFreeze(): Promise<void> {
  const stats = await db.userStats.get(1)
  if (!stats) return
  const now = new Date()
  const weekKey = `${getISOWeekYear(now)}-W${getISOWeek(now)}`
  if (stats.freezeWeek === weekKey) return

  await db.userStats.update(1, {
    freezeWeek: weekKey,
    streakFreezes: Math.min(2, stats.streakFreezes + 1),
    updatedAt: Date.now(),
    syncPending: true,
  })
  requestSync()
}
