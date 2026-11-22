import { describe, expect, it } from 'vitest'
import { est1RM } from '@/lib/workoutMath'
import { standardFor } from '@/features/ranks/standards'
import { rateSet } from '@/features/ranks/scoring'
import { rankFor } from '@/features/ranks/tiers'
import { prPace, repsToBeat, repsToRank } from './prPace'

const BENCH = 'ex-barbell-bench-press'
const ctx = { sex: 'male' as const, bodyKg: 80 }

describe('the live PR line', () => {
  it('finds the fewest reps whose est. 1RM beats the best', () => {
    const best = est1RM(100, 5) // 116.7
    expect(repsToBeat(100, best)).toBe(6)
    expect(repsToBeat(80, best)).toBe(14) // 80 × (1 + 14/30) = 117.3
    expect(repsToBeat(120, best)).toBe(1) // heavier than the best's est. 1RM: one rep does it
    expect(repsToBeat(40, best)).toBeNull() // past 20 reps
    expect(repsToBeat(100, 0)).toBeNull() // nothing logged yet: nothing to beat
  })

  it('reaches the next division with its reps, and not with one fewer', () => {
    const std = standardFor(BENCH)!
    const rank = rankFor(rateSet(std, { weight: 80, reps: 8 }, ctx.sex, ctx.bodyKg))
    const reps = repsToRank(BENCH, 90, rank, ctx)!
    expect(reps).toBeGreaterThan(0)
    expect(rateSet(std, { weight: 90, reps }, ctx.sex, ctx.bodyKg)).toBeGreaterThanOrEqual(rank.nextAt!)
    if (reps > 1) expect(rateSet(std, { weight: 90, reps: reps - 1 }, ctx.sex, ctx.bodyKg)).toBeLessThan(rank.nextAt!)
  })

  it('only says what’s within reach of the reps the set is set up for', () => {
    const best = est1RM(100, 5)
    expect(prPace({ exerciseId: 'x', kg: 100, planned: 5, best, ctx: null })).toBe('6 reps = new best')
    expect(prPace({ exerciseId: 'x', kg: 80, planned: 8, best, ctx: null })).toBeNull() // 14 reps, far past 8
    expect(prPace({ exerciseId: 'x', kg: 120, planned: 1, best, ctx: null })).toBe('1 rep = new best')
  })

  it('names the next division beside the best, fewest reps first', () => {
    const std = standardFor(BENCH)!
    const best = est1RM(100, 5)
    // 100 × 5 rates Diamond II (644) for an 80 kg man; Diamond III starts at 667
    const near = rankFor(rateSet(std, { weight: 100, reps: 5 }, ctx.sex, ctx.bodyKg))
    expect(near.nextLabel).toBe('Diamond III')
    expect(prPace({ exerciseId: BENCH, kg: 100, planned: 8, best, rank: near, ctx })).toBe('6 reps = new best and Diamond III')
    expect(prPace({ exerciseId: BENCH, kg: 105, planned: 8, best, rank: near, ctx })).toBe('4 reps = new best · 5 = Diamond III')
  })

  it('leaves the est. 1RM out on an assisted move', () => {
    expect(prPace({ exerciseId: 'x', kg: 30, planned: 8, best: 20, ctx: null, assisted: true })).toBeNull()
  })
})
