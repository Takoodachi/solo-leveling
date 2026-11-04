import { describe, expect, it } from 'vitest'
import { convertWeightText, fromKg, weightKg } from './units'

describe('kg / lb', () => {
  it('stores what is typed in pounds as kilos, and gives 135 back as 135', () => {
    const kg = weightKg('135', 'lb')
    expect(kg).toBe(61.23) // stored to two decimals
    expect(fromKg(kg ?? 0, 'lb')).toBe(135)
  })

  it('converts a field when the unit is switched, so the real weight never changes', () => {
    expect(convertWeightText('60', 'kg', 'lb')).toBe('132.28')
    expect(weightKg(convertWeightText('60', 'kg', 'lb'), 'lb')).toBeCloseTo(60, 2)
  })

  it('leaves kilos as they are', () => {
    expect(weightKg('62.5', 'kg')).toBe(62.5)
    expect(fromKg(62.5, 'kg')).toBe(62.5)
  })
})
