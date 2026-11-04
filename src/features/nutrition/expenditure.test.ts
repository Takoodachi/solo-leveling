import { describe, expect, it } from 'vitest'
import { daysBefore } from '@/test/db'
import { estimateExpenditure } from './expenditure'

const today = '2026-11-03'
const noWalking = new Map<string, number>()

/** Food logged on the given days back, at `kcal` (or a per-day function). */
function eaten(days: number[], kcal: number | ((back: number) => number)) {
  return new Map(days.map(back => [daysBefore(today, back), typeof kcal === 'number' ? kcal : kcal(back)]))
}
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
/** Weigh-ins on the given days back, losing `perWeek` kg a week from 80 kg four weeks ago. */
const weighIns = (days: number[], perWeek: number) => days.map(back => ({ date: daysBefore(today, back), weightKg: 80 + ((28 - back) * perWeek) / 7 }))

describe('estimateExpenditure', () => {
  it('is what was eaten plus what the weight lost is worth', () => {
    const result = estimateExpenditure(eaten(range(1, 28), 2300), weighIns([27, 22, 17, 12, 7, 2], -0.15), noWalking, today)
    expect(result.ready).toBe(true)
    if (!result.ready) return
    expect(result.eaten).toBe(2300)
    expect(result.kcal).toBeGreaterThanOrEqual(2460)
    expect(result.kcal).toBeLessThanOrEqual(2470)
    expect(result.kgPerWeek).toBe(-0.15)
    expect(result.recentDays).toBe(14)
  })

  it('says nothing until there are two weeks of food', () => {
    const result = estimateExpenditure(eaten(range(1, 10), 2300), weighIns([27, 22, 17, 12, 7, 2], 0), noWalking, today)
    expect(result).toMatchObject({ ready: false, foodDays: 10 })
  })

  it('leaves out half-logged days', () => {
    const food = eaten(range(1, 28), back => (back % 5 === 0 ? 800 : 2300))
    const result = estimateExpenditure(food, weighIns([27, 22, 17, 12, 7, 2], 0), noWalking, today)
    expect(result.ready && result.eaten).toBe(2300)
    expect(result.ready && result.foodDays).toBe(23)
  })

  it('counts recent days more than old ones', () => {
    const food = eaten(range(1, 28), back => (back <= 14 ? 2600 : 2000))
    const result = estimateExpenditure(food, weighIns([27, 22, 17, 12, 7, 2], 0), noWalking, today)
    expect(result.ready && result.eaten).toBeGreaterThan(2350)
  })
})
