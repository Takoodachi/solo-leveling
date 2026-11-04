import { describe, expect, it } from 'vitest'
import type { Exercise } from '@/types'
import { liftMetFromHeartRate } from '@/lib/workoutMath'
import type { BlockDraft, SetDraft, WorkoutDraft } from './types'
import { noticeFor } from './workoutNotice'

const ex = (name: string, over: Partial<Exercise> = {}) => ({ uuid: name, name, category: 'chest', type: 'strength', defaultUnit: 'kg', isCustom: false, updatedAt: 0, ...over }) as Exercise
const set = (weight: string, reps: string, done = false, duration = ''): SetDraft => ({ uuid: Math.random().toString(36), weight, reps, duration, distanceKm: '', done })
const block = (exercise: Exercise, sets: SetDraft[], over: Partial<BlockDraft> = {}): BlockDraft => ({ exercise, restSec: 90, sets, ...over })
const draft = (blocks: BlockDraft[]): WorkoutDraft => ({ startedAt: 1_000, name: 'Push Day', notes: '', blocks })
const now = 50_000

describe('noticeFor', () => {
  it('shows the first set still to do, and the rest while it runs', () => {
    const d = draft([block(ex('Bench Press'), [set('60', '8', true), set('60', '8'), set('60', '8')]), block(ex('Dip'), [set('', '10')])])
    expect(noticeFor(d, now + 60_000, now)).toEqual({ name: 'Push Day', title: 'Bench Press', text: 'Set 2 of 3 · 60 kg × 8', startedAt: 1_000, restEndsAt: now + 60_000 })
    expect(noticeFor(d, now - 1, now).restEndsAt).toBeNull()
  })

  it('reads each kind of set', () => {
    expect(noticeFor(draft([block(ex('Dip'), [set('', '12')])]), null, now).text).toBe('Set 1 of 1 · 12 reps')
    expect(noticeFor(draft([block(ex('Squat'), [set('135', '5')], { unit: 'lb' })]), null, now).text).toBe('Set 1 of 1 · 135 lb × 5')
    expect(noticeFor(draft([block(ex('Plank', { defaultUnit: 'min' }), [set('', '', false, '1.5')])]), null, now).text).toBe('Set 1 of 1 · 1.5 min')
    expect(noticeFor(draft([block(ex('Running', { type: 'cardio', defaultUnit: 'min' }), [set('', '', false, '30')])]), null, now).text).toBe('30 min')
  })

  it('says so when every set is done, without a rest', () => {
    const d = draft([block(ex('Bench Press'), [set('60', '8', true)])])
    expect(noticeFor(d, now + 60_000, now)).toMatchObject({ title: 'All sets done', restEndsAt: null })
    expect(noticeFor(draft([]), null, now).title).toBe('Add an exercise')
  })
})

describe('liftMetFromHeartRate (ACSM bands at a max of 190)', () => {
  it('picks the band', () => {
    expect(liftMetFromHeartRate(100)).toBe(3) // 53%: very light
    expect(liftMetFromHeartRate(115)).toBe(3.5) // 61%: light
    expect(liftMetFromHeartRate(130)).toBe(5) // 68%: moderate
    expect(liftMetFromHeartRate(150)).toBe(6) // 79%: vigorous
  })
})
