import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { resetDb } from '@/test/db'
import { achievementXp } from '@/features/gamification/achievements'
import { evaluateAchievements } from './achievementEval'
import { totalXp } from './xp'

describe('evaluateAchievements', () => {
  beforeEach(async () => {
    await resetDb()
    await db.userStats.put({ id: 1, xp: 0, level: 1, currentStreak: 0, longestStreak: 0, lastLogDate: null, streakFreezes: 0, updatedAt: 0 })
  })

  it('pays an achievement once when two checks are asked for at the same time', async () => {
    await db.workouts.put({ uuid: 'w1', date: '2026-11-01', notes: '', durationMin: 30, createdAt: 1, updatedAt: 1 })
    const [first, second] = await Promise.all([evaluateAchievements(), evaluateAchievements()])
    expect(first.length).toBeGreaterThan(0)
    expect(second).toEqual([])
    const stats = await db.userStats.get(1)
    expect(totalXp(stats!.level, stats!.xp)).toBe(first.reduce((xp, def) => xp + achievementXp(def), 0))
  })

  it('sees what was logged since the last check', async () => {
    expect(await evaluateAchievements()).toEqual([])
    await db.workouts.put({ uuid: 'w1', date: '2026-11-01', notes: '', durationMin: 30, createdAt: 1, updatedAt: 1 })
    expect((await evaluateAchievements()).length).toBeGreaterThan(0)
  })
})
