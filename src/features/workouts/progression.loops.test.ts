import { describe, expect, it } from 'vitest'
import { suggestProgress } from './progression'

// A lift logged in pounds whose history gives a step under the 2.5 lb grid (0.41 kg = 0.9 lb:
// a session typed in kg beside ones in lb). Rounding to the grid put the weight back where it
// was, and the loops that walk the weight up or down never ended: the workout screen froze on Start.
const wristCurl = { uuid: 'ex-cable-wrist-curl', name: 'Cable Wrist Curl', type: 'strength' as const, defaultUnit: 'kg' as const }
const lb50 = 22.68 // 50 lb as it's stored
const trend = { gapDays: 3, flat: 1, step: 0.41 }

describe('suggestProgress with a step smaller than the pound grid', () => {
  it('ends the walk up', () => {
    const hint = suggestProgress({ exercise: wristCurl, lastSets: [15, 15, 15].map(reps => ({ weight: lb50, reps })), trend, targetReps: 12, unit: 'lb' })
    expect(hint?.kind).toBe('weight')
    expect(hint?.fill?.weight).toBe(52.5)
  })

  it('ends the walk down', () => {
    const hard = [{ weight: lb50, reps: 6 }, { weight: lb50, reps: 5 }, { weight: lb50, reps: 5, rpe: 10 }]
    const hint = suggestProgress({ exercise: wristCurl, lastSets: hard, trend, targetReps: 12, unit: 'lb' })
    expect(hint?.kind).toBe('reset')
    expect(hint?.fill?.weight).toBe(45)
  })
})
