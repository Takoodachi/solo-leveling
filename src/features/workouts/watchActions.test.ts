import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Exercise } from '@/types'
import { useWorkoutStore } from './store'
import type { BlockDraft, SetDraft, WorkoutDraft } from './types'
import { applyWatchAction } from './watchActions'
import { restEndsAt } from './hooks/useRestTimer'

// The rest timer keeps its end in localStorage and tells the page through window: stand-ins for both
const kept = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), removeItem: (k: string) => void kept.delete(k) })
vi.stubGlobal('window', new EventTarget())

const ex = (name: string) => ({ uuid: name, name, category: 'legs', type: 'strength', defaultUnit: 'kg', isCustom: false, updatedAt: 0 }) as Exercise
const set = (weight: string, reps: string, done = false): SetDraft => ({ uuid: Math.random().toString(36), weight, reps, duration: '', distanceKm: '', done })
const block = (exercise: Exercise, sets: SetDraft[], over: Partial<BlockDraft> = {}): BlockDraft => ({ exercise, restSec: 120, sets, ...over })
const start = (blocks: BlockDraft[], over: Partial<WorkoutDraft> = {}) =>
  useWorkoutStore.setState({ draft: { startedAt: Date.now() - 600_000, name: 'Leg Day', notes: '', blocks, ...over } })
const sets = () => useWorkoutStore.getState().draft?.blocks.flatMap(b => b.sets.map(s => `${s.weight}×${s.reps}${s.done ? ' ✓' : ''}`))

describe('the watch’s buttons', () => {
  beforeEach(() => kept.clear())

  it('Done ticks the set the watch shows and starts its rest', () => {
    start([block(ex('Squat'), [set('100', '8', true), set('100', '8')]), block(ex('Leg Curl'), [set('40', '12')])])
    applyWatchAction('tick', 90)
    expect(sets()).toEqual(['100×8 ✓', '100×8 ✓', '40×12'])
    const left = (restEndsAt() ?? 0) - Date.now()
    expect(left).toBeGreaterThan(118_000) // the exercise's own 120 s, not the default
  })

  it('an empty set is done as last time’s, in the exercise’s unit', () => {
    start([block(ex('Squat'), [set('', '')], { unit: 'lb', lastSets: [{ weight: 61.23, reps: 5 }] })])
    applyWatchAction('tick', 90)
    expect(sets()).toEqual(['135×5 ✓'])
  })

  it('Skip ends the rest, +15 s stretches it', () => {
    start([block(ex('Squat'), [set('100', '8')])])
    applyWatchAction('tick', 90)
    const end = restEndsAt() ?? 0
    applyWatchAction('add15', 90)
    expect(restEndsAt()).toBe(end + 15_000)
    applyWatchAction('skip', 90)
    expect(restEndsAt()).toBeNull()
  })

  it('does nothing while a past workout is edited, or with nothing left to tick', () => {
    start([block(ex('Squat'), [set('100', '8')])], { editing: { workoutId: 'w', date: '2026-11-16' } as WorkoutDraft['editing'] })
    applyWatchAction('tick', 90)
    expect(sets()).toEqual(['100×8'])
    start([block(ex('Squat'), [set('100', '8', true)])])
    applyWatchAction('tick', 90)
    expect(sets()).toEqual(['100×8 ✓'])
    expect(restEndsAt()).toBeNull()
  })
})
