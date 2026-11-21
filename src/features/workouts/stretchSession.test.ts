import { describe, expect, it } from 'vitest'
import type { Exercise } from '@/types'
import type { BlockDraft } from './types'
import { breakLength, holdLength, nextHold, previousHold, secondsLeft } from './stretchSession'

const stretch = (name: string) => ({ uuid: name, name, category: 'Stretching', type: 'flexibility', defaultUnit: 'min', isCustom: false, updatedAt: 0 }) as Exercise
const hold = (duration: string, done = false) => ({ uuid: Math.random().toString(36), weight: '', reps: '', duration, distanceKm: '', done })
const block = (name: string, sets: ReturnType<typeof hold>[], restSec = 0): BlockDraft => ({ exercise: stretch(name), restSec, sets })

describe('a stretching session', () => {
  const draft = { blocks: [block('Quad', [hold('30', true), hold('30')]), block('Pigeon', [hold('45'), hold('')], 20)] }

  it('goes from hold to hold, past the ones done, and Back can reach a done one', () => {
    expect(nextHold(draft)).toEqual({ b: 0, s: 1 })
    expect(nextHold(draft, { b: 0, s: 1 })).toEqual({ b: 1, s: 0 })
    expect(nextHold(draft, { b: 1, s: 1 })).toBeNull()
    expect(previousHold(draft, { b: 0, s: 1 })).toEqual({ b: 0, s: 0 })
    expect(previousHold(draft, { b: 0, s: 0 })).toBeNull()
  })

  it('breaks briefly for the other side, longer for a new stretch, and as the stretch says when it has a rest', () => {
    expect(breakLength(draft, { b: 0, s: 0 }, { b: 0, s: 1 })).toBe(5)
    expect(breakLength(draft, { b: 0, s: 1 }, { b: 1, s: 0 })).toBe(10)
    expect(breakLength(draft, { b: 1, s: 0 }, { b: 1, s: 1 })).toBe(20)
  })

  it('counts what is left: holds not done and the breaks between them', () => {
    expect(holdLength(draft, { b: 1, s: 1 })).toBe(30) // an empty field holds the usual 30 s
    // 30 (quad, side 2) + 10 + 45 (pigeon) + 20 + 30 (pigeon, empty field)
    expect(secondsLeft(draft, { b: 0, s: 1 })).toBe(135)
  })
})
