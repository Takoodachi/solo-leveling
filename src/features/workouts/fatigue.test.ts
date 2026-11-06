import { beforeEach, describe, expect, it } from 'vitest'
import { BUILT_IN_EXERCISES } from '@/data/exercises'
import { db } from '@/db'
import { resetDb } from '@/test/db'
import { blockHistory } from './hooks/useWorkoutHistory'
import type { Exercise } from '@/types'
import { orderEffect, overlap, preload, repRatio } from './fatigue'
import { suggestProgress } from './progression'
import type { BlockDraft, SetDraft } from './types'

const ex = (id: string) => {
  const found = BUILT_IN_EXERCISES.find(e => e.uuid === id)
  if (!found) throw new Error(`no ${id}`)
  return found
}
const chestPress = ex('ex-machine-chest-press')
const shoulderPress = ex('ex-seated-shoulder-press')
const squat = ex('ex-barbell-back-squat')
const set = (done: boolean): SetDraft => ({ uuid: Math.random().toString(36), weight: '50', reps: '8', duration: '', distanceKm: '', done })
const block = (exercise: Exercise, done: number, more: Partial<BlockDraft> = {}): BlockDraft => ({
  exercise, restSec: 90, sets: [...Array.from({ length: done }, () => set(true)), set(false)], ...more,
})

describe('what earlier exercises leave on this one', () => {
  it('counts shared muscles: a helper for one is half a set', () => {
    expect(overlap(shoulderPress, chestPress)).toBe(0.5) // front delts help the chest press
    expect(overlap(chestPress, shoulderPress)).toBe(0.5)
    expect(overlap(squat, chestPress)).toBe(0)
  })

  it('adds up the sets, by exercise, leaving the exercise itself out', () => {
    expect(preload(shoulderPress, [{ exercise: chestPress, sets: 4 }, { exercise: squat, sets: 5 }, { exercise: shoulderPress, sets: 3 }]))
      .toEqual({ sets: 2, after: ['Machine Chest Press'] })
  })

  it('expects about 5% fewer reps per set, at most 25%', () => {
    expect(repRatio(2, 0)).toBeCloseTo(0.9)
    expect(repRatio(0, 2)).toBeCloseTo(1 / 0.9)
    expect(repRatio(20, 0)).toBeCloseTo(0.75)
    expect(repRatio(3, 3)).toBe(1)
  })

  it('weighs what was ticked today against last time, and knows nothing for an older card', () => {
    const blocks = [block(chestPress, 4), block(shoulderPress, 0, { lastPreload: { sets: 0, after: [] } })]
    expect(orderEffect(blocks, 1)).toEqual({ ratio: 0.9, today: ['Machine Chest Press'], last: [] })
    expect(orderEffect([block(chestPress, 4), block(shoulderPress, 0)], 1)).toBeUndefined()
  })
})

describe('tips that follow the order', () => {
  const lastSets = (reps: number) => [1, 2, 3].map(() => ({ weight: 40, reps }))
  const trend = { gapDays: 3, flat: 1 }
  const hint = (reps: number, ratio: number, today: string[] = [], last: string[] = []) =>
    suggestProgress({ exercise: shoulderPress, lastSets: lastSets(reps), trend, targetReps: 8, order: { ratio, today, last } })

  it('holds the weight when it comes after more related work than last time', () => {
    const tip = hint(8, 0.85, ['Machine Chest Press'])
    expect(tip?.kind).toBe('hold')
    expect(tip?.title).toBe('Stay at 40 kg')
    expect(tip?.why).toContain('After Machine Chest Press today, expect about 1 rep fewer than last time.')
    expect(tip?.fill?.reps).toEqual([8, 8, 8])
  })

  it('jumps when it comes fresher than last time', () => {
    const tip = hint(7, 1.15, [], ['Machine Chest Press'])
    expect(tip?.kind).toBe('weight')
    expect(tip?.why).toMatch(/^Last time 7 · 7 · 7 at 40 kg\. Fresher than last time \(it came after Machine Chest Press then\)/)
  })

  it('changes nothing for less than half a rep', () => {
    const plain = suggestProgress({ exercise: shoulderPress, lastSets: lastSets(8), trend, targetReps: 8 })
    expect(hint(8, 0.97, ['Machine Chest Press'])).toEqual(plain)
  })
})

describe('what came before it last time', () => {
  beforeEach(resetDb)

  it('reads the order the last workout saved (block x 100 + set)', async () => {
    const now = Date.now()
    await db.exercises.bulkPut([chestPress, shoulderPress, squat])
    const workout = (uuid: string, createdAt: number) => ({ uuid, date: '2026-11-01', name: 'Push', notes: '', durationMin: 60, createdAt, updatedAt: now })
    await db.workouts.bulkPut([workout('older', now - 9e6), workout('newer', now - 1e6)])
    const sets = (workoutId: string, exerciseId: string, block: number, n: number) =>
      Array.from({ length: n }, (_, i) => ({ uuid: `${workoutId}-${exerciseId}-${i}`, workoutId, exerciseId, setIndex: block * 100 + i, weight: 40, reps: 8, updatedAt: now }))
    await db.workoutSets.bulkPut([
      ...sets('older', shoulderPress.uuid, 0, 3), // came first the time before
      ...sets('newer', squat.uuid, 0, 5),
      ...sets('newer', chestPress.uuid, 1, 4),
      ...sets('newer', shoulderPress.uuid, 2, 3),
    ])
    expect((await blockHistory(shoulderPress.uuid)).lastPreload).toEqual({ sets: 2, after: ['Machine Chest Press'] })
    expect((await blockHistory(squat.uuid)).lastPreload).toEqual({ sets: 0, after: [] })
  })
})
