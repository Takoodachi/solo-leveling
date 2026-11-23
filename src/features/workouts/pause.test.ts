import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { resetDb } from '@/test/db'
import type { Settings } from '@/types'
import { calorieBudget } from '@/features/dashboard/hooks/useCalorieBudget'
import { pausedUntil, setPause } from './pause'

const now = Date.now()
const paused = async () => (await db.checkins.toArray()).filter(c => c.key === 'pause' && c.done).map(c => c.date).sort()

describe('pausing training', () => {
  beforeEach(resetDb)

  it('pauses each day up to the one the plan comes back on, and says which that is', async () => {
    await setPause('2026-11-23', '2026-11-26')
    expect(await paused()).toEqual(['2026-11-23', '2026-11-24', '2026-11-25'])
    expect(await pausedUntil('2026-11-23')).toBe('2026-11-26')
    expect(await pausedUntil('2026-11-25')).toBe('2026-11-26')
    // It ends by itself: the day it comes back isn't paused, nor was the day before it began
    expect(await pausedUntil('2026-11-26')).toBeNull()
    expect(await pausedUntil('2026-11-22')).toBeNull()
  })

  it('resumes from today on, and the days already paused stay that way', async () => {
    await setPause('2026-11-23', '2026-11-30')
    await setPause('2026-11-25', null)
    expect(await paused()).toEqual(['2026-11-23', '2026-11-24'])
    expect(await pausedUntil('2026-11-25')).toBeNull()
    expect(await pausedUntil('2026-11-23')).toBe('2026-11-25')
  })

  it('a new end replaces the old one, and other check-ins are left alone', async () => {
    await db.checkins.put({ uuid: 'skip-2026-11-24', date: '2026-11-24', key: 'skip', done: true, updatedAt: now })
    await setPause('2026-11-23', '2026-12-07')
    await setPause('2026-11-24', '2026-11-27')
    expect(await paused()).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26'])
    await setPause('2026-11-25', '2026-11-29') // later again
    expect(await paused()).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28'])
    expect(await pausedUntil('2026-11-25')).toBe('2026-11-29')
    expect(await db.checkins.get('skip-2026-11-24')).toMatchObject({ done: true })
  })

  it('gives a paused workout day the baseline carbs, not a workout day’s', async () => {
    await db.settings.put({ id: 1, dynamicTargetsEnabled: false, updatedAt: now } as Settings)
    await db.targets.put({ id: 1, dailyKcal: 2350, dailyProtein: 175, dailyCarbs: 269, dailyFat: 64, updatedAt: now })
    await db.routines.put({ uuid: 'r', name: 'Push Day', category: 'strength', level: 'intermediate', exercises: [], scheduleDays: [1, 3, 5], updatedAt: now })
    expect((await calorieBudget('2026-11-23')).targets.carbs).toBeGreaterThan(269) // a Monday on the plan
    await setPause('2026-11-23', '2026-11-30')
    expect((await calorieBudget('2026-11-23')).targets).toMatchObject({ kcal: 2350, carbs: 269, fat: 64 })
    expect((await calorieBudget('2026-11-30')).targets.carbs).toBeGreaterThan(269) // back on the plan
  })
})
