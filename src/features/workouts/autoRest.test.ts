import { describe, expect, it } from 'vitest'
import type { Exercise } from '@/types'
import { autoRest, restAfterSet } from './autoRest'

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

  it('switched off, a set rests the exercise’s own time, else the default', () => {
    expect(restAfterSet({ exercise: ex('Barbell Bench Press'), restSec: 75 }, 90, false)).toEqual({ seconds: 75, why: '' })
    expect(restAfterSet({ exercise: ex('Barbell Bench Press'), restSec: 0 }, 90, false)).toEqual({ seconds: 90, why: '' })
    expect(restAfterSet({ exercise: ex('Barbell Bench Press'), restSec: 75 }, 90, true)?.seconds).toBe(150)
  })

  it('a stretch with no rest of its own starts none, on or off', () => {
    const stretch = ex('Quad Stretch', { type: 'flexibility', defaultUnit: 'min' })
    expect(restAfterSet({ exercise: stretch, restSec: 0 }, 90, true)).toBeNull()
    expect(restAfterSet({ exercise: stretch, restSec: 20 }, 90, true)).toEqual({ seconds: 20, why: '' })
  })
})
