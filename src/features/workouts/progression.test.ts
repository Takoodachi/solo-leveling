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

  it('takes a bigger step when one would still leave the reps over the target, up to 10%', () => {
    const hint = suggestProgress({ exercise: bench, lastSets: sets(60, 12, 12, 12), trend: trend(), targetReps: 8 })
    expect(hint?.fill?.weight).toBe(65) // 62.5 would still be about 10 reps; 67.5 is over 10% heavier
    expect(hint?.title).toBe('Go up to 65 kg')
    expect(hint?.why).toBe('Last time 12 · 12 · 12 at 60 kg, well past 8, so it’s a bigger step than usual. Aim for 6–8 reps.')
    // A single-joint lift moves 5% at most, so one step
    const pushdown = { uuid: 'ex-tricep-pushdown', name: 'Tricep Pushdown', type: 'strength' as const, defaultUnit: 'kg' as const }
    expect(suggestProgress({ exercise: pushdown, lastSets: sets(50, 20, 20, 20), trend: trend(), targetReps: 12 })?.fill?.weight).toBe(52.5)
  })

  it('counts a last set with 3+ reps left for more, so it jumps sooner', () => {
    const easy = [{ weight: 60, reps: 9 }, { weight: 60, reps: 9 }, { weight: 60, reps: 9, rpe: 7 }]
    expect(suggestProgress({ exercise: bench, lastSets: easy.map(({ weight, reps }) => ({ weight, reps })), trend: trend(), targetReps: 10 })?.kind).toBe('reps')
    const hint = suggestProgress({ exercise: bench, lastSets: easy, trend: trend(), targetReps: 10 })
    expect(hint?.kind).toBe('weight')
    expect(hint?.fill?.weight).toBe(62.5)
    expect(hint?.why).toBe('Last time 9 · 9 · 9 at 60 kg with 3+ reps left. Aim for 8–10 reps.')
  })

  it('steps down when the last set took everything and is still under the range', () => {
    const hard = [{ weight: 60, reps: 5 }, { weight: 60, reps: 4 }, { weight: 60, reps: 4, rpe: 10 }]
    const hint = suggestProgress({ exercise: bench, lastSets: hard, trend: trend(), targetReps: 8 })
    expect(hint?.title).toBe('Drop to 57.5 kg')
    expect(hint?.fill).toEqual({ weight: 57.5, from: 60 })
  })

  it('brings the rest of today’s aims down when a set comes in short', () => {
    const today = [{ weight: '60', reps: '6', done: true }, { weight: '60', reps: '9', done: false }, { weight: '60', reps: '9', done: false }]
    const hint = suggestProgress({ exercise: bench, lastSets: sets(60, 8, 8, 7), trend: trend(), targetReps: 10, sets: today })
    expect(hint?.kind).toBe('hold')
    // Aims were 9 · 9 · 8 (a rep past last time's 8 · 8 · 7); set 1 got 6 of its 9, so the rest keep two thirds of theirs
    expect(hint?.why).toMatch(/^Aim for 6 · 5 on the rest: set 1 came in 3 under\./)
    expect(hint?.fill?.reps).toEqual([9, 6, 5])
  })

  it('says to rest longer when the reps fell off steeply on a short rest', () => {
    const steep = (restSec: number) => suggestProgress({ exercise: bench, lastSets: sets(60, 10, 8, 6), trend: trend(), targetReps: 10, restSec })?.why
    expect(steep(60)).toContain('2–3 min of rest instead of 60 s')
    expect(steep(180)).not.toContain('min of rest')
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
