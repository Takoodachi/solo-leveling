import { beforeEach, describe, expect, it } from 'vitest'
import { BUILT_IN_EXERCISES } from '@/data/exercises'
import { db } from '@/db'
import { resetDb } from '@/test/db'
import { blockHistory } from './hooks/useWorkoutHistory'
import type { Exercise } from '@/types'
import { orderEffect, overlap, preload, repRatio, restedRatio } from './fatigue'
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
      .toEqual({ sets: 2, after: ['Machine Chest Press'], total: 9 })
  })

  it('expects about 5% fewer reps per set for the same muscles, at most 25%', () => {
    expect(repRatio({ sets: 2 }, { sets: 0 })).toBeCloseTo(0.9)
    expect(repRatio({ sets: 0 }, { sets: 2 })).toBeCloseTo(1 / 0.9)
    expect(repRatio({ sets: 20 }, { sets: 0 })).toBeCloseTo(0.75)
    expect(repRatio({ sets: 3 }, { sets: 3 })).toBe(1)
  })

  it('expects about 1% fewer per set for other muscles, at most 10%', () => {
    const none = { sets: 0, total: 0 }
    expect(repRatio({ sets: 0, total: 5 }, none)).toBeCloseTo(0.95)
    expect(repRatio({ sets: 0, total: 30 }, none)).toBeCloseTo(0.9)
    expect(repRatio({ sets: 2, total: 9 }, none)).toBeCloseTo(0.83) // 2 sets for its muscles, 7 for others
    expect(repRatio({ sets: 20, total: 40 }, none)).toBeCloseTo(0.75)
  })

  it('weighs what was ticked today against last time, and knows nothing for an older card', () => {
    const blocks = [block(chestPress, 4), block(shoulderPress, 0, { lastPreload: { sets: 0, after: [] } })]
    expect(orderEffect(blocks, 1)).toEqual({ ratio: 0.9, today: ['Machine Chest Press'], last: [] })
    expect(orderEffect([block(chestPress, 4), block(shoulderPress, 0)], 1)).toBeUndefined()
  })

  it('expects about 1% fewer reps per set its muscles got in the last two days, at most 15%', () => {
    expect(restedRatio({ sets: 8, after: [] }, { sets: 0, after: [] })).toBeCloseTo(0.92)
    expect(restedRatio({ sets: 30, after: [] }, { sets: 0, after: [] })).toBeCloseTo(0.85)
    expect(restedRatio({ sets: 0, after: [] }, { sets: 5, after: [] })).toBeCloseTo(1 / 0.95)
    // Says so when that's what moved the reps most
    const recovery = { today: { sets: 8, after: ['Pull'] }, last: { sets: 0, after: [] } }
    const effect = orderEffect([block(shoulderPress, 0, { lastPreload: { sets: 0, after: [], total: 0 }, recovery })], 0)
    expect(effect?.ratio).toBeCloseTo(0.92)
    expect(effect?.rested).toEqual({ today: ['Pull'], last: [] })
  })

  it('counts every set before it, and says so when that count is what differs', () => {
    const last = { sets: 2, after: ['Machine Chest Press'], total: 4 }
    const effect = orderEffect([block(squat, 5), block(chestPress, 4), block(shoulderPress, 0, { lastPreload: last })], 2)
    expect(effect?.ratio).toBeCloseTo(0.83 / 0.88) // the chest press as last time, five sets of squats more
    expect(effect?.before).toEqual({ today: 9, last: 4 })
    // The squats aren't counted on a card made before every set was
    const older = orderEffect([block(squat, 5), block(chestPress, 4), block(shoulderPress, 0, { lastPreload: { sets: 2, after: [] } })], 2)
    expect(older?.ratio).toBe(1)
    expect(older?.before).toBeUndefined()
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

  it('names the workouts of the days before when that’s what costs the reps', () => {
    const tip = suggestProgress({ exercise: shoulderPress, lastSets: lastSets(10), trend, targetReps: 12, order: { ratio: 0.9, today: [], last: [], rested: { today: ['Pull'], last: [] } } })
    expect(tip?.why).toContain('After Pull in the last two days, expect about 1 rep fewer than last time.')
  })

  it('counts the sets when it’s how many came before, not which', () => {
    const after = (ratio: number, before: { today: number; last: number }) =>
      suggestProgress({ exercise: shoulderPress, lastSets: lastSets(10), trend, targetReps: 12, order: { ratio, today: [], last: [], before } })
    const later = after(0.93, { today: 12, last: 5 })
    expect(later?.kind).toBe('hold')
    expect(later?.fill?.reps).toEqual([10, 10, 10])
    expect(later?.why).toContain('After 12 earlier sets today (5 last time), expect about 1 rep fewer.')
    const sooner = after(1.08, { today: 0, last: 8 })
    expect(sooner?.fill?.reps).toEqual([12, 12, 12])
    expect(sooner?.why).toContain('Fresher than last time (8 earlier sets then, 0 today), so expect about 1 rep more.')
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
    expect((await blockHistory(shoulderPress.uuid)).lastPreload).toEqual({ sets: 2, after: ['Machine Chest Press'], total: 9 })
    expect((await blockHistory(squat.uuid)).lastPreload).toEqual({ sets: 0, after: [], total: 0 })
    // Both workouts were within the day: 3 + 3 shoulder press sets, and half of the 4 chest press sets
    expect((await blockHistory(shoulderPress.uuid)).recovery).toEqual({ today: { sets: 8, after: ['Push'] }, last: { sets: 3, after: ['Push'] } })
  })
})
