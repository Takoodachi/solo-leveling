import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { resetDb } from '@/test/db'
import type { Settings } from '@/types'
import { setPause } from '@/features/workouts/pause'
import { buildRecap } from './recap'

const week = '2026-11-02' // a Monday

describe('the recap’s workout goal', () => {
  beforeEach(resetDb)

  it('counts only the days training wasn’t paused, and a paused week is nothing logged', async () => {
    await db.settings.put({ id: 1, weeklyWorkoutGoal: 4, updatedAt: Date.now() } as Settings)
    expect((await buildRecap('week', week)).workoutGoal).toBe(4)
    await setPause('2026-11-05', '2026-11-09') // Thursday to Sunday
    expect((await buildRecap('week', week)).workoutGoal).toBe(2) // 4 × 3/7
    await setPause('2026-11-02', '2026-11-09')
    const paused = await buildRecap('week', week)
    expect(paused.workoutGoal).toBe(0)
    expect(paused.empty).toBe(true)
  })
})
