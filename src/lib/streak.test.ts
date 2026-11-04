import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db'
import { resetDb } from '@/test/db'
import { streakAlive, updateStreak } from './streak'

describe('streakAlive', () => {
  it('stands through three missed days, as in the owner’s example (31st → 4th)', () => {
    expect(streakAlive('2026-10-31', '2026-11-01')).toBe(true)
    expect(streakAlive('2026-10-31', '2026-11-04')).toBe(true)
    expect(streakAlive('2026-10-31', '2026-11-05')).toBe(false)
    expect(streakAlive(null, '2026-11-01')).toBe(false)
  })
})

describe('updateStreak', () => {
  // Only the clock is faked: the stand-in database runs on real timers
  beforeEach(async () => {
    await resetDb()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 4, 12))
  })
  afterEach(() => vi.useRealTimers())

  async function logToday(lastLogDate: string | null, currentStreak: number, longestStreak = currentStreak) {
    await db.userStats.put({ id: 1, xp: 0, level: 1, currentStreak, longestStreak, lastLogDate, streakFreezes: 0, updatedAt: 0 })
    await updateStreak()
    return db.userStats.get(1)
  }

  it('carries on after three missed days', async () => {
    expect((await logToday('2026-10-31', 5))?.currentStreak).toBe(6)
  })

  it('starts again after four, keeping the best', async () => {
    const stats = await logToday('2026-10-30', 5, 9)
    expect(stats?.currentStreak).toBe(1)
    expect(stats?.longestStreak).toBe(9)
  })

  it('counts a day once', async () => {
    expect((await logToday('2026-11-04', 7))?.currentStreak).toBe(7)
  })

  it('raises the best along with the streak', async () => {
    const stats = await logToday('2026-11-03', 9)
    expect(stats?.currentStreak).toBe(10)
    expect(stats?.longestStreak).toBe(10)
    expect(stats?.syncPending).toBe(true)
  })
})
