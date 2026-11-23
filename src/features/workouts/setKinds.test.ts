import { describe, expect, it } from 'vitest'
import type { Exercise, WorkoutSet } from '@/types'
import { setCredit } from '@/features/analytics/volume'
import { useWorkoutStore } from './store'
import type { SetDraft, WorkoutDraft } from './types'
import { chainEnd, lastMain, mainOf } from './setKinds'
import { dropWeight, suggestProgress, applyFill } from './progression'
import { liftRpe } from './effort'
import { describeSet } from './describeSet'
import { noticeFor } from './workoutNotice'

const bench = { uuid: 'ex-barbell-bench-press', name: 'Barbell Bench Press', category: 'Chest', type: 'strength', defaultUnit: 'kg', isCustom: false, updatedAt: 0 } as Exercise
const row = (over: Partial<SetDraft> = {}): SetDraft => ({ uuid: Math.random().toString(36), weight: '100', reps: '6', duration: '', distanceKm: '', done: false, ...over })
const start = (sets: SetDraft[]) => useWorkoutStore.setState({ draft: { startedAt: 1, name: 'Push', notes: '', blocks: [{ exercise: bench, restSec: 90, sets }] }, finished: false })
const rows = () => useWorkoutStore.getState().draft!.blocks[0].sets
const shape = () => rows().map(s => `${s.kind ?? 'set'} ${s.weight}${s.failure ? ' F' : ''}`)

describe('drop sets, rest-pause and partials', () => {
  it('finds a set’s rows, the set a row belongs to, and the last ordinary set', () => {
    const sets = [{}, {}, { kind: 'drop' as const }, { kind: 'drop' as const }, {}]
    expect(chainEnd(sets, 1)).toBe(4)
    expect(chainEnd(sets, 2)).toBe(3) // a row on its own
    expect(chainEnd(sets, 4)).toBe(5)
    expect(mainOf(sets, 3)).toBe(1)
    expect(lastMain(sets)).toBe(4)
    expect(lastMain([{}, { kind: 'partials' as const }])).toBe(0)
  })

  it('starts a drop set 20% lighter, down to the equipment’s step', () => {
    expect(dropWeight('100', 'Barbell Bench Press', 'kg')).toBe('80')
    expect(dropWeight('62.5', 'Barbell Bench Press', 'kg')).toBe('50')
    expect(dropWeight('14', 'Dumbbell Curl', 'kg')).toBe('10')
    expect(dropWeight('225', 'Barbell Bench Press', 'lb')).toBe('180')
    expect(dropWeight('', 'Barbell Bench Press', 'kg')).toBe('')
  })

  it('adds a row after the set’s own rows, opening the card', () => {
    start([row({ done: true }), row({ done: true }), row({ done: true, weight: '90' })])
    useWorkoutStore.setState(s => ({ draft: { ...s.draft!, blocks: [{ ...s.draft!.blocks[0], collapsed: true }] } }))
    useWorkoutStore.getState().addCarryOn(0, 2, 'drop')
    useWorkoutStore.getState().addCarryOn(0, 2, 'drop')
    useWorkoutStore.getState().addCarryOn(0, 3, 'partials') // from a row: after the set's last row
    expect(shape()).toEqual(['set 100', 'set 100', 'set 90', 'drop 70', 'drop 55', 'partials 55'])
    expect(useWorkoutStore.getState().draft!.blocks[0].collapsed).toBe(false)
  })

  it('takes a set out with its rows, and Undo puts them all back', () => {
    start([row(), row({ weight: '90' }), row({ kind: 'drop', weight: '70' }), row({ weight: '80' })])
    const removed = rows().slice(1, 3)
    useWorkoutStore.getState().removeSet(0, 1)
    expect(shape()).toEqual(['set 100', 'set 80'])
    useWorkoutStore.getState().restoreSet(0, 1, removed, bench.uuid, 1)
    expect(shape()).toEqual(['set 100', 'set 90', 'drop 70', 'set 80'])
    useWorkoutStore.getState().removeSet(0, 2) // a row alone
    expect(shape()).toEqual(['set 100', 'set 90', 'set 80'])
  })

  it('keeps "None" left and the last set’s failure mark the same thing', () => {
    start([row({ done: true }), row({ done: true }), row({ kind: 'drop', done: true })])
    const store = useWorkoutStore.getState()
    store.setEffort(0, 'hard')
    expect(shape()).toEqual(['set 100', 'set 100 F', 'drop 100']) // on the last ordinary set, not the drop
    store.setEffort(0, 'right')
    expect(shape()).toEqual(['set 100', 'set 100', 'drop 100'])
    expect(useWorkoutStore.getState().draft!.blocks[0].effort).toBe('right')
    store.toggleFailure(0, 1)
    expect(shape()).toEqual(['set 100', 'set 100 F', 'drop 100'])
    expect(useWorkoutStore.getState().draft!.blocks[0].effort).toBeUndefined()
    store.toggleFailure(0, 0) // any set can be marked
    store.toggleFailure(0, 2) // a drop set can't
    expect(shape()).toEqual(['set 100 F', 'set 100 F', 'drop 100'])
  })

  it('saves failure as rpe 10 on any set, the reps-left answer on the last, nothing on a row', () => {
    expect(liftRpe({ failure: true }, false, undefined)).toBe(10)
    expect(liftRpe({}, true, 'easy')).toBe(7)
    expect(liftRpe({}, false, 'easy')).toBeUndefined()
    expect(liftRpe({ kind: 'drop', failure: true }, true, 'easy')).toBeUndefined()
  })

  it('counts a row half a set, and leaves it out of the tips', () => {
    expect(setCredit({ reps: 8, kind: 'drop' })).toBe(0.5)
    expect(setCredit({ reps: 8 })).toBe(1)
    const plain = [{ weight: 100, reps: 6 }, { weight: 100, reps: 6 }, { weight: 100, reps: 5, rpe: 10 }]
    const withRows = [...plain, { weight: 100, reps: 3, kind: 'rest-pause' as const }, { weight: 70, reps: 8, kind: 'drop' as const }]
    expect(suggestProgress({ exercise: bench, lastSets: withRows })).toEqual(suggestProgress({ exercise: bench, lastSets: plain }))
    // "Use" fills the sets themselves, by their own order
    const filled = applyFill([row({ reps: '' }), row({ kind: 'drop', weight: '80', reps: '' }), row({ reps: '' })], { reps: [7, 6] })
    expect(filled.map(s => s.reps)).toEqual(['7', '', '6'])
  })

  it('reads in a list with what it is', () => {
    const set = (over: Partial<WorkoutSet>) => ({ weight: 100, reps: 6, ...over }) as WorkoutSet
    expect(describeSet(set({}), bench, 'kg')).toBe('100×6')
    expect(describeSet(set({ rpe: 10 }), bench, 'kg')).toBe('100×6 F')
    expect(describeSet(set({ weight: 80, reps: 8, kind: 'drop' }), bench, 'kg')).toBe('↳ 80×8 drop set')
    expect(describeSet(set({ reps: 3, kind: 'rest-pause' }), bench, 'kg')).toBe('↳ 100×3 rest-pause')
  })

  it('shows on the lock screen and the watch as what it is, sets counted without the rows', () => {
    const draft: WorkoutDraft = { startedAt: 1, name: 'Push', notes: '', blocks: [{ exercise: bench, restSec: 90, sets: [row({ done: true }), row({ done: true }), row({ kind: 'drop', weight: '80', reps: '8' }), row()] }] }
    expect(noticeFor(draft, null, 2).text).toBe('Drop set · 80 kg × 8')
    draft.blocks[0].sets[2].done = true
    expect(noticeFor(draft, null, 2).text).toBe('Set 3 of 3 · 100 kg × 6')
  })
})
