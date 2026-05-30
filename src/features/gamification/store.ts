import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { ACHIEVEMENT_DEFS } from './achievements'
export { xpForLevel } from '@/lib/xp'

export function useGamification() {
  const userStats = useLiveQuery(() => db.userStats.get(1), [])
  const achievements = useLiveQuery(
    () => db.achievements.toArray().then(arr => arr.sort((a, b) => b.unlockedAt - a.unlockedAt)),
    []
  )

  const unlockedKeys = new Set((achievements ?? []).map(a => a.key))

  const allAchievements = ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    unlocked: unlockedKeys.has(def.key),
    unlockedAt: achievements?.find(a => a.key === def.key)?.unlockedAt,
  }))

  return {
    xp: userStats?.xp ?? 0,
    level: userStats?.level ?? 1,
    currentStreak: userStats?.currentStreak ?? 0,
    longestStreak: userStats?.longestStreak ?? 0,
    streakFreezes: userStats?.streakFreezes ?? 0,
    achievements: achievements ?? [],
    allAchievements,
  }
}

