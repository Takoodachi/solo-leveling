import { describe, expect, it } from 'vitest'
import type { LiftTrend } from './types'
import { suggestProgress } from './progression'

const bench = { uuid: 'ex-barbell-bench-press', name: 'Barbell Bench Press', type: 'strength' as const, defaultUnit: 'kg' as const }
const curl = { uuid: 'ex-dumbbell-curl', name: 'Dumbbell Curl', type: 'strength' as const, defaultUnit: 'kg' as const }
const sets = (weight: number, ...reps: number[]) => reps.map(r => ({ weight, reps: r }))
const trend = (over: Partial<LiftTrend> = {}): LiftTrend => ({ gapDays: 3, flat: 1, ...over })

describe('suggestProgress (double progression)', () => {
  it('takes the next weight once every set reaches the target', () => {
    const hint = suggestProgress({ exercise: bench, lastSets: sets(60, 8, 8, 8), trend: trend(), targetReps: 8 })
    expect(hint?.kind).toBe('weight')
    expect(hint?.fill?.weight).toBe(62.5)
  })

  it('adds reps at the same weight while the target isn’t reached', () => {
    expect(suggestProgress({ exercise: bench, lastSets: sets(60, 8, 7, 6), trend: trend(), targetReps: 8 })?.kind).toBe('reps')
  })

  it('builds a light lift past its target before jumping (a 10 kg curl to 17 before 12.5 kg)', () => {
    expect(suggestProgress({ exercise: curl, lastSets: sets(10, 12, 12, 12), trend: trend(), targetReps: 12 })?.kind).toBe('reps')
    const hint = suggestProgress({ exercise: curl, lastSets: sets(10, 17, 17, 17), trend: trend(), targetReps: 12 })
    expect(hint?.kind).toBe('weight')
    expect(hint?.fill?.weight).toBe(12.5)
  })

  it('eases back in after four weeks away', () => {
    expect(suggestProgress({ exercise: bench, lastSets: sets(60, 8, 8, 8), trend: trend({ gapDays: 30 }), targetReps: 8 })?.kind).toBe('ease')
  })

  it('suggests a reset after three sessions at the same weight without more reps', () => {
    expect(suggestProgress({ exercise: bench, lastSets: sets(60, 6, 6, 6), trend: trend({ flat: 3 }), targetReps: 8 })?.kind).toBe('reset')
  })

  it('works in pounds for a lift logged in pounds (135 lb → 140)', () => {
    const hint = suggestProgress({ exercise: bench, lastSets: sets(61.23, 8, 8, 8), trend: trend(), targetReps: 8, unit: 'lb' })
    expect(hint?.kind).toBe('weight')
    expect(hint?.fill?.weight).toBe(140)
  })
})
