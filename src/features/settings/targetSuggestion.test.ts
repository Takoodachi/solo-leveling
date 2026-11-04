import { describe, expect, it } from 'vitest'
import { goalPace, macrosFor, suggestedTargets } from './targetSuggestion'

const today = '2026-11-03'

describe('goalPace', () => {
  it('cuts at 0.5% a week unless another pace is chosen', () => {
    expect(goalPace('cut', undefined, undefined, today)).toBe(-0.5)
    expect(goalPace('cut', 0.25, undefined, today)).toBe(-0.25)
  })

  it('bulks at 0.5% in the first year of lifting, 0.25% after', () => {
    expect(goalPace('bulk', undefined, '2026-06-01', today)).toBe(0.5)
    expect(goalPace('bulk', undefined, '2024-01-01', today)).toBe(0.25)
    expect(goalPace('bulk', undefined, undefined, today)).toBe(0.25)
  })

  it('holds on maintain, whatever cut pace is saved', () => {
    expect(goalPace('maintain', 0.75, undefined, today)).toBe(0)
  })
})

describe('macrosFor', () => {
  it('asks 2.2 g of protein per kg on a cut, 1.8 otherwise', () => {
    expect(macrosFor(2400, 80, 'cut').dailyProtein).toBe(176)
    expect(macrosFor(2400, 80, 'bulk').dailyProtein).toBe(144)
  })

  it('counts protein by a weight capped at a BMI of 27', () => {
    expect(macrosFor(3000, 120, 'maintain', 180).dailyProtein).toBe(Math.round(1.8 * 27 * 1.8 ** 2))
  })

  it('keeps fat at a fifth of the calories at least, and carbs never below zero', () => {
    expect(macrosFor(4000, 50, 'maintain').dailyFat).toBe(Math.round((0.2 * 4000) / 9))
    expect(macrosFor(900, 90, 'cut').dailyCarbs).toBe(0)
  })
})

describe('suggestedTargets', () => {
  it('takes the pace off maintenance: 0.5% of 80 kg a week is 440 kcal a day', () => {
    expect(suggestedTargets(80, 'cut', 2500, -0.5).dailyKcal).toBe(2060)
  })

  it('adds the surplus on a bulk', () => {
    expect(suggestedTargets(80, 'bulk', 2500, 0.25).dailyKcal).toBe(2720)
  })
})
