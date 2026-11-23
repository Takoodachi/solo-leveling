import { describe, expect, it } from 'vitest'
import type { Exercise } from '@/types'
import { autoRest, restAfterSet } from './autoRest'
import type { SetDraft } from './types'

const ex = (name: string, over: Partial<Exercise> = {}) => ({ uuid: name, name, category: 'Chest', type: 'strength', defaultUnit: 'kg', isCustom: false, updatedAt: 0, ...over }) as Exercise

describe('Auto rest', () => {
  it('rests by the movement: heavy barbell lifts longest, small raises shortest', () => {
    expect(autoRest(ex('Barbell Bench Press'))).toEqual({ seconds: 150, why: 'Heavy lift' })
    expect(autoRest(ex('Seated Cable Row'))?.seconds).toBe(120)
    expect(autoRest(ex('Pull-Up', { type: 'bodyweight' }))?.seconds).toBe(120)
    expect(autoRest(ex('Dumbbell Curl'))).toEqual({ seconds: 90, why: 'Isolation' })
    expect(autoRest(ex('Dumbbell Lateral Raise'))?.seconds).toBe(60)
    expect(autoRest(ex('Plank', { defaultUnit: 'min' }))).toEqual({ seconds: 60, why: 'Hold' })
  })

  it('gives 30 s more after a set to failure', () => {
    expect(autoRest(ex('Barbell Back Squat'), true)).toEqual({ seconds: 180, why: 'Heavy lift · failure' })
    expect(autoRest(ex('Leg Extension'), true)?.seconds).toBe(120)
  })

  it('leaves stretches and cardio alone', () => {
    expect(autoRest(ex('Quad Stretch', { type: 'flexibility', defaultUnit: 'min' }))).toBeNull()
    expect(autoRest(ex('Running', { type: 'cardio', defaultUnit: 'min' }))).toBeNull()
  })

  const row = (over: Partial<SetDraft> = {}): SetDraft => ({ uuid: Math.random().toString(36), weight: '100', reps: '6', duration: '', distanceKm: '', done: true, ...over })
  const bench = (sets: SetDraft[], restSec = 75) => ({ exercise: ex('Barbell Bench Press'), restSec, sets })

  it('switched off, a set rests the exercise’s own time, else the default', () => {
    expect(restAfterSet(bench([row()]), 0, 90, false)).toEqual({ seconds: 75, why: '' })
    expect(restAfterSet(bench([row()], 0), 0, 90, false)).toEqual({ seconds: 90, why: '' })
    expect(restAfterSet(bench([row()]), 0, 90, true)?.seconds).toBe(150)
  })

  it('a stretch with no rest of its own starts none, on or off', () => {
    const stretch = ex('Quad Stretch', { type: 'flexibility', defaultUnit: 'min' })
    expect(restAfterSet({ exercise: stretch, restSec: 0, sets: [row()] }, 0, 90, true)).toBeNull()
    expect(restAfterSet({ exercise: stretch, restSec: 20, sets: [row()] }, 0, 90, true)).toEqual({ seconds: 20, why: '' })
  })

  it('goes straight on to a drop set or partials, and pauses 15 s before rest-pause, on or off', () => {
    for (const auto of [true, false]) {
      expect(restAfterSet(bench([row(), row({ kind: 'drop', done: false })]), 0, 90, auto)).toBeNull()
      expect(restAfterSet(bench([row(), row({ kind: 'partials', done: false })]), 0, 90, auto)).toBeNull()
      expect(restAfterSet(bench([row(), row({ kind: 'rest-pause', done: false })]), 0, 90, auto)).toEqual({ seconds: 15, why: 'Rest-pause' })
    }
  })

  it('rests as after failure once the last drop set is done, or after a set marked to failure', () => {
    expect(restAfterSet(bench([row({ failure: true }), row({ kind: 'drop' })]), 1, 90, true)).toEqual({ seconds: 180, why: 'Heavy lift · failure' })
    expect(restAfterSet(bench([row({ failure: true }), row()]), 0, 90, true)?.seconds).toBe(180)
    expect(restAfterSet(bench([row({ failure: true })]), 0, 90, false)?.seconds).toBe(75) // switched off: the exercise's own time
  })
})
