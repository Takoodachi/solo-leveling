import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

export function useGamification() {
  const userStats = useLiveQuery(() => db.userStats.get(1), [])
  const achievements = useLiveQuery(
    () => db.achievements.toArray().then(arr => arr.sort((a, b) => b.unlockedAt - a.unlockedAt)),
    []
  )

  return {
    xp: userStats?.xp ?? 0,
    level: userStats?.level ?? 1,
    currentStreak: userStats?.currentStreak ?? 0,
    longestStreak: userStats?.longestStreak ?? 0,
    streakFreezes: userStats?.streakFreezes ?? 0,
    achievements: achievements ?? [],
  }
}

export function xpForLevel(n: number): number {
  return Math.round(100 * Math.pow(n, 1.5))
}
