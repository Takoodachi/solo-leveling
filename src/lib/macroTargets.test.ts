import { describe, expect, it } from 'vitest'
import { targetsForDay, type EffectiveTargets } from './macroTargets'

const base = { id: 1 as const, dailyKcal: 2350, dailyProtein: 175, dailyCarbs: 269, dailyFat: 64, updatedAt: 0 }
const kcal = (t: EffectiveTargets) => t.protein * 4 + t.carbs * 4 + t.fat * 9

describe('targetsForDay', () => {
  it('is the baseline without steps or a plan', () => {
    expect(targetsForDay(base, 0)).toEqual({ kcal: 2350, protein: 175, carbs: 269, fat: 64 })
  })

  it('grows carbs and fat by what the steps burned, never protein', () => {
    const day = targetsForDay(base, 300)
    expect(day.protein).toBe(175)
    expect(kcal(day) - kcal(targetsForDay(base, 0))).toBeGreaterThan(290)
    expect(kcal(day) - kcal(targetsForDay(base, 0))).toBeLessThan(310)
  })

  for (const perWeek of [1, 3, 5, 6]) {
    it(`moves carbs for fat on ${perWeek} workout day(s) a week, keeping every day's calories and the week's carbs`, () => {
      const training = targetsForDay(base, 0, { training: true, perWeek })
      const rest = targetsForDay(base, 0, { training: false, perWeek })
      expect(training.carbs).toBeGreaterThan(base.dailyCarbs)
      expect(Math.abs(kcal(training) - kcal(rest))).toBeLessThanOrEqual(12) // rounding to whole grams
      expect(Math.abs(perWeek * training.carbs + (7 - perWeek) * rest.carbs - 7 * base.dailyCarbs)).toBeLessThanOrEqual(7)
      expect(rest.carbs).toBeGreaterThanOrEqual(Math.floor(base.dailyCarbs * 0.7))
      expect(training.fat * 9).toBeGreaterThanOrEqual(0.15 * base.dailyKcal - 9)
    })
  }

  it('leaves a week of training every day alone (no rest days to give back to)', () => {
    expect(targetsForDay(base, 0, { training: true, perWeek: 7 }).carbs).toBe(269)
  })
})
