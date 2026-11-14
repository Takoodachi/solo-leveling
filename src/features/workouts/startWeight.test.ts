import { describe, expect, it } from 'vitest'
import { suggestStart } from './startWeight'

const dbBench = { uuid: 'ex-dumbbell-bench-press', name: 'Dumbbell Bench Press' }
const bench = { exerciseId: 'ex-barbell-bench-press', name: 'Barbell Bench Press', regions: ['chest'] as const, rank: { rating: 500 } }

describe('a first weight for a lift never logged', () => {
  it('goes by the lifter’s related lifts, a little under, on the usual step', () => {
    // A 500 on the chest is an intermediate: a 40 kg dumbbell 1RM at 80 kg, so about 27 kg for 10, down to 25
    const hint = suggestStart({ exercise: dbBench, sex: 'male', bodyKg: 80, lifts: [bench] })
    expect(hint?.kind).toBe('start')
    expect(hint?.title).toBe('Try about 25 kg')
    expect(hint?.fill).toEqual({ weight: 25 })
    expect(hint?.why).toContain('Barbell Bench Press')
  })

  it('works in pounds for a lift logged in pounds', () => {
    expect(suggestStart({ exercise: dbBench, unit: 'lb', sex: 'male', bodyKg: 80, lifts: [bench] })?.title).toBe('Try about 55 lb')
  })

  it('says nothing without a related lift, or for a lift without a weight standard', () => {
    expect(suggestStart({ exercise: dbBench, sex: 'male', bodyKg: 80, lifts: [] })).toBeNull()
    expect(suggestStart({ exercise: { uuid: 'ex-push-up', name: 'Push-Up' }, sex: 'male', bodyKg: 80, lifts: [bench] })).toBeNull()
  })
})
