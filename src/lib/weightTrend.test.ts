import { describe, expect, it } from 'vitest'
import { goalProjection } from './weightTrend'

// The weight page's goal line: how far the trend is from the goal weight, and when the recent pace gets it there
describe('goalProjection', () => {
  it('counts the days at the recent pace, losing or gaining alike', () => {
    expect(goalProjection(80, 76, -0.5 / 7)).toEqual({ gapKg: -4, days: 56 }) // 4 kg at 0.5 kg a week: 8 weeks
    expect(goalProjection(60, 62, 0.25 / 7)).toEqual({ gapKg: 2, days: 56 })
  })

  it('gives no date when the trend is heading away, holding steady, or has no pace yet', () => {
    expect(goalProjection(80, 76, 0.3 / 7).days).toBeNull()
    expect(goalProjection(80, 76, 0.02 / 7).days).toBeNull()
    expect(goalProjection(80, 76, null)).toEqual({ gapKg: -4, days: null })
  })

  it('is there within a few tenths, whatever the pace', () => {
    expect(goalProjection(75.2, 75, 0.5 / 7).days).toBe(0)
    expect(goalProjection(74.9, 75, null).days).toBe(0)
  })

  it('never says zero days while it is still a way off', () => {
    expect(goalProjection(75.4, 75, -2).days).toBe(1)
  })
})
