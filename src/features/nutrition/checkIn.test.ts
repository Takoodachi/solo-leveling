import { parseISO } from 'date-fns'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { daysBefore, resetDb } from '@/test/db'
import type { Settings } from '@/types'
import { answerCheckIn, loadCheckIn } from './checkIn'

const today = '2026-11-03' // a Tuesday; its week starts 2026-11-02
const now = Date.now()

/** Four weeks of a person eating 2,300 kcal a day and losing 0.15 kg a week, on a Mon/Wed/Fri plan. */
async function seed(settings: Partial<Settings>, opts: { loggedDays?: number[]; trainedEvery?: number } = {}) {
  await db.settings.put({ id: 1, sex: 'male', heightCm: 175, goalType: 'cut', trainingSince: '2022-01-01', dynamicTargetsEnabled: false, updatedAt: now, ...settings } as Settings)
  await db.targets.put({ id: 1, dailyKcal: 2500, dailyProtein: 150, dailyCarbs: 300, dailyFat: 70, updatedAt: now })
  await db.foods.put({ uuid: 'f', name: 'Test food', kcalPerServing: 100, protein: 5, carbs: 12, fat: 3, servingSize: 1, servingUnit: 'serving', isCustom: true, isFavorite: false, updatedAt: now })
  const logged = opts.loggedDays ?? Array.from({ length: 28 }, (_, i) => i + 1).filter(back => back % 9 !== 0)
  await db.foodLog.bulkPut(logged.map(back => ({ uuid: `log-${back}`, date: daysBefore(today, back), foodId: 'f', servings: 23, mealType: 'lunch' as const, updatedAt: now })))
  await db.bodyMetrics.bulkPut([27, 22, 17, 12, 7, 2].map(back => ({ uuid: `w-${back}`, date: daysBefore(today, back), weightKg: 80 - ((27 - back) * 0.15) / 7, updatedAt: now })))
  await db.routines.put({ uuid: 'r', name: 'Push Day', category: 'strength', level: 'intermediate', exercises: [], scheduleDays: [1, 3, 5], updatedAt: now })
  const every = opts.trainedEvery ?? 1
  let planned = 0
  for (let back = 1; back <= 28; back++) {
    const date = daysBefore(today, back)
    if (![1, 3, 5].includes(parseISO(date).getDay())) continue
    if (planned++ % every === 0) await db.workouts.put({ uuid: `wo-${back}`, date, name: 'Push Day', notes: '', durationMin: 50, startedAt: now, createdAt: now, updatedAt: now })
  }
}

describe('loadCheckIn', () => {
  beforeEach(resetDb)

  it('offers new targets from what was burned, moving at most 150 kcal a week', async () => {
    await seed({ goalPace: 0.5 })
    const checkIn = await loadCheckIn(today)
    expect(checkIn).not.toBeNull()
    expect(checkIn?.burn).toBeGreaterThanOrEqual(2460)
    expect(checkIn?.burn).toBeLessThanOrEqual(2470)
    expect(checkIn?.next.dailyKcal).toBe(2350) // the ideal is about 2,030: held to −150
    expect(checkIn?.held).toBe(true)
    expect(checkIn?.next.dailyProtein).toBe(Math.round(2.2 * (80 - (25 * 0.15) / 7)))
    expect(checkIn?.workouts).toEqual({ planned: 12, done: 12 })
  })

  it('halves a bulk’s surplus while training is under half the plan', async () => {
    await seed({ goalType: 'bulk' }, { trainedEvery: 4 })
    const checkIn = await loadCheckIn(today)
    expect(checkIn?.trimmed).toBe(true)
    expect(checkIn?.pace).toBe(0.125)
    expect(checkIn?.workouts).toEqual({ planned: 12, done: 3 })
  })

  it('waits for 10 of the last 14 days to be logged', async () => {
    await seed({}, { loggedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25] })
    expect(await loadCheckIn(today)).toBeNull()
  })

  it('asks once a week: an answer, applied or kept, puts it away', async () => {
    await seed({ goalPace: 0.5 })
    const checkIn = await loadCheckIn(today)
    if (!checkIn) throw new Error('expected a check-in')
    await answerCheckIn(checkIn, true)
    expect((await db.targets.get(1))?.dailyKcal).toBe(2350)
    expect(await db.checkins.get('targets-2026-11-02')).toMatchObject({ done: true, amount: 2350, key: 'targets' })
    expect(await loadCheckIn(today)).toBeNull()
  })
})
