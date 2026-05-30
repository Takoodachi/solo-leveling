import { db } from '@/db'
import { today } from './date'
import { subDays, format, parseISO } from 'date-fns'

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
  } else if (stats.lastLogDate === null) {
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

export async function grantWeeklyStreakFreeze(): Promise<void> {
  const stats = await db.userStats.get(1)
  if (!stats) return
  if (stats.streakFreezes < 2) {
    await db.userStats.update(1, {
      streakFreezes: stats.streakFreezes + 1,
      updatedAt: Date.now(),
      syncPending: true,
    })
  }
}
