import { describe, expect, it } from 'vitest'
import { platesFor } from './plates'

describe('platesFor', () => {
  it('loads each side heaviest first', () => {
    expect(platesFor(100, 20, 'kg')).toEqual({ perSide: [25, 15], loaded: 100 })
    expect(platesFor(142.5, 20, 'kg')).toEqual({ perSide: [25, 25, 10, 1.25], loaded: 142.5 })
    expect(platesFor(225, 45, 'lb')).toEqual({ perSide: [45, 45], loaded: 225 })
    expect(platesFor(185, 45, 'lb')).toEqual({ perSide: [45, 25], loaded: 185 })
  })

  it('gets as close as the plates allow without going over', () => {
    expect(platesFor(61, 20, 'kg')).toEqual({ perSide: [20], loaded: 60 })
    expect(platesFor(137, 45, 'lb')).toEqual({ perSide: [45], loaded: 135 })
  })

  it('is just the bar at the bar’s weight, and on a lighter bar', () => {
    expect(platesFor(20, 20, 'kg')).toEqual({ perSide: [], loaded: 20 })
    expect(platesFor(40, 15, 'kg')).toEqual({ perSide: [10, 2.5], loaded: 40 })
  })
})
