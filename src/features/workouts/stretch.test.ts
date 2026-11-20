import { describe, expect, it } from 'vitest'
import { BUILT_IN_EXERCISES } from '@/data/exercises'
import { ROUTINE_TEMPLATES } from '@/data/routineTemplates'
import { exerciseMinutes, liftMetFor, routineMinutes, setModeFor } from '@/lib/workoutMath'
import { describeSet } from './describeSet'
import { bodyMap } from './musclesWorked'
import { durationOf, holdMinutes, holdText, lastSetsOf } from './units'

const byId = new Map(BUILT_IN_EXERCISES.map(e => [e.uuid, e]))
const ex = (id: string) => {
  const found = byId.get(id)
  if (!found) throw new Error(`no exercise ${id}`)
  return found
}

describe('stretches', () => {
  it('are logged as holds in seconds, stored in minutes like every other duration', () => {
    const hamstring = ex('ex-standing-hamstring-stretch')
    expect(setModeFor(hamstring)).toBe('stretch')
    expect(holdMinutes('30')).toBe(0.5)
    expect(holdText(holdMinutes('20'))).toBe('20') // 0.333… min comes back as 20 s
    expect(durationOf('45', { exercise: hamstring })).toBe(0.75)
    expect(durationOf('1.5', { exercise: ex('ex-plank') })).toBe(1.5) // a plank's field is minutes already
    expect(lastSetsOf({ exercise: hamstring, lastSets: [{ duration: 0.5 }, { duration: 0.75 }] })).toEqual([{ duration: 30 }, { duration: 45 }])
    expect(describeSet({ duration: 0.5 }, hamstring, 'kg')).toBe('30 s')
  })

  it('take their hold time in a routine, and burn like light stretching', () => {
    const hold = { exerciseId: 'ex-childs-pose', sets: 2, reps: 30, restSec: 0 }
    expect(exerciseMinutes(hold, ex('ex-childs-pose'))).toBe(1)
    expect(liftMetFor(undefined, [ex('ex-childs-pose'), ex('ex-pigeon-pose')])).toBe(2.3)
    expect(liftMetFor('stretching', [])).toBe(2.3)
    expect(liftMetFor(undefined, [ex('ex-childs-pose'), ex('ex-barbell-back-squat')])).toBe(5) // a lift makes it training
  })

  it('show on the body map only when the workout was nothing but stretches', () => {
    const stretch = { duration: 0.5, exercise: ex('ex-standing-quad-stretch') }
    const squat = { duration: undefined, exercise: ex('ex-barbell-back-squat') }
    expect(bodyMap([stretch]).label).toBe('Muscles stretched')
    expect(bodyMap([stretch]).work.has('quads')).toBe(true)
    const mixed = bodyMap([squat, { duration: 0.5, exercise: ex('ex-overhead-triceps-stretch') }])
    expect(mixed.label).toBe('Muscles worked')
    expect(mixed.work.has('triceps')).toBe(false) // a hold trains nothing
  })

  it('have unique ids, and every template uses exercises that exist', () => {
    expect(byId.size).toBe(BUILT_IN_EXERCISES.length)
    // Two entries a picker can't tell apart ("Child's Pose" and "Childs Pose") would split one exercise's history
    expect(new Set(BUILT_IN_EXERCISES.map(e => e.name.toLowerCase().replace(/[^a-z0-9]/g, ''))).size).toBe(BUILT_IN_EXERCISES.length)
    const stretches = BUILT_IN_EXERCISES.filter(e => e.category === 'Stretching')
    expect(stretches.length).toBeGreaterThan(30)
    expect(stretches.every(e => e.type === 'flexibility' && e.instructions && e.muscles?.length)).toBe(true)
    for (const t of ROUTINE_TEMPLATES) for (const re of t.exercises) expect(byId.has(re.exerciseId), `${t.name}: ${re.exerciseId}`).toBe(true)
    const stretching = ROUTINE_TEMPLATES.filter(t => t.category === 'stretching')
    expect(stretching.length).toBeGreaterThanOrEqual(3)
    for (const t of stretching) expect(routineMinutes(t.exercises, id => byId.get(id))).toBeLessThanOrEqual(15)
  })
})
