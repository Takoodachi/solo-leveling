import { beforeEach, describe, expect, it } from 'vitest'
import { BUILT_IN_EXERCISES } from '@/data/exercises'
import { db } from '@/db'
import { toDateStr } from '@/lib/date'
import { resetDb } from '@/test/db'
import type { Exercise, Settings, Workout } from '@/types'
import type { LiftTrend } from './types'
import { plateauOf, suggestProgress } from './progression'
import { liftPlateaus, plateauHint, showsPlateaus, workoutPlateaus } from './plateau'
import { setPause } from './pause'
import { getWorkoutWithSets } from './hooks/useWorkoutHistory'

const ex = (id: string): Exercise => {
  const found = BUILT_IN_EXERCISES.find(e => e.uuid === id)
  if (!found) throw new Error(`no ${id}`)
  return found
}
const bench = ex('ex-barbell-bench-press')
const squat = ex('ex-barbell-back-squat')
const curl = ex('ex-dumbbell-curl')
const plank = ex('ex-plank')
const assisted = ex('ex-assisted-pull-up')
const sets = (weight: number, ...reps: number[]) => reps.map(r => ({ weight, reps: r }))
const trend = (over: Partial<LiftTrend> = {}): LiftTrend => ({ gapDays: 3, flat: 1, ...over })

describe('the plateau rule (the workout tip’s own)', () => {
  it('is three sessions without more reps, with the tip’s lighter weight', () => {
    const input = { exercise: bench, lastSets: sets(60, 6, 6, 6), trend: trend({ flat: 3 }), targetReps: 8 }
    expect(plateauOf(input)).toEqual({ sessions: 3, from: 60, to: 55, unit: 'kg' })
    expect(suggestProgress(input)?.fill?.weight).toBe(55)
    expect(plateauOf({ ...input, trend: trend({ flat: 2 }) })).toBeNull()
  })

  it('is no plateau where the tip says something else', () => {
    // Every set at the target: the tip says go up
    expect(plateauOf({ exercise: bench, lastSets: sets(60, 8, 8, 8), trend: trend({ flat: 3 }), targetReps: 8 })).toBeNull()
    // A routine aiming for 6 makes the same sets a step up, not a plateau
    expect(plateauOf({ exercise: bench, lastSets: sets(60, 6, 6, 6), trend: trend({ flat: 3 }), targetReps: 6 })).toBeNull()
    // Four weeks away: ease back in instead
    expect(plateauOf({ exercise: bench, lastSets: sets(60, 6, 6, 6), trend: trend({ flat: 3, gapDays: 30 }), targetReps: 8 })).toBeNull()
    // No weight to take off: an assisted move, a bodyweight one, a timed hold
    expect(plateauOf({ exercise: assisted, lastSets: sets(30, 6, 6, 6), trend: trend({ flat: 3 }), targetReps: 10 })).toBeNull()
    expect(plateauOf({ exercise: bench, lastSets: sets(0, 6, 6, 6), trend: trend({ flat: 3 }) })).toBeNull()
    expect(plateauOf({ exercise: plank, lastSets: [{ duration: 1 }], trend: trend({ flat: 3 }) })).toBeNull()
  })

  it('takes the tip’s drop when the last set left nothing, and works in the lift’s unit', () => {
    const hard = [{ weight: 60, reps: 5 }, { weight: 60, reps: 4 }, { weight: 60, reps: 4, rpe: 10 }]
    expect(plateauOf({ exercise: bench, lastSets: hard, trend: trend({ flat: 3 }), targetReps: 8 })).toEqual({ sessions: 3, from: 60, to: 57.5, unit: 'kg' })
    expect(plateauOf({ exercise: bench, lastSets: hard, trend: trend({ flat: 1 }), targetReps: 8 })).toBeNull() // a step down, not a plateau
    expect(plateauOf({ exercise: bench, lastSets: sets(61.23, 6, 6, 6), trend: trend({ flat: 4 }), targetReps: 8, unit: 'lb' }))
      .toEqual({ sessions: 4, from: 135, to: 120, unit: 'lb' })
  })
})

const DAY = 86_400_000
const now = Date.now()
let count = 0

/** A workout `daysAgo`, with each lift's sets at one weight. */
async function logWorkout(daysAgo: number, lifts: [Exercise, number, number[]][], more: Partial<Workout> = {}): Promise<string> {
  const at = now - daysAgo * DAY
  const uuid = `w${count++}`
  await db.workouts.put({ uuid, date: toDateStr(new Date(at)), notes: '', durationMin: 60, createdAt: at, updatedAt: at, ...more })
  await db.workoutSets.bulkPut(lifts.flatMap(([exercise, weight, reps], b) => reps.map((r, i) => (
    { uuid: `${uuid}-${b}-${i}`, workoutId: uuid, exerciseId: exercise.uuid, setIndex: b * 100 + i, weight, reps: r, updatedAt: at }
  ))))
  return uuid
}

describe('plateaus on Home', () => {
  beforeEach(async () => {
    await resetDb()
    await db.exercises.bulkPut([bench, squat, curl, plank])
  })

  it('finds the lifts that plateaued, and only those', async () => {
    for (const daysAgo of [9, 6, 3]) {
      const lifts: [Exercise, number, number[]][] = [[bench, 60, [6, 6, 6]]]
      if (daysAgo < 9) lifts.push([curl, 12, [8, 8, 8]]) // two curl sessions: not enough yet
      const id = await logWorkout(daysAgo, lifts)
      await db.workoutSets.put({ uuid: `plank-${id}`, workoutId: id, exerciseId: plank.uuid, setIndex: 200, duration: 1, updatedAt: now }) // a hold, not a weight
    }
    await logWorkout(8, [[squat, 100, [5, 5, 5]]])
    await logWorkout(5, [[squat, 100, [6, 6, 5]]])
    await logWorkout(2, [[squat, 100, [6, 6, 6]]]) // more reps each time

    expect(await liftPlateaus(now)).toEqual([
      { exerciseId: bench.uuid, name: bench.name, sessions: 3, from: 60, to: 55, unit: 'kg', since: now - 9 * DAY },
    ])
  })

  it('aims for the routine’s reps, as the workout does', async () => {
    await db.routines.put({ uuid: 'r', name: 'Push', category: 'strength', level: 'intermediate', exercises: [{ exerciseId: bench.uuid, sets: 3, reps: 6, restSec: 120 }], scheduleDays: [], updatedAt: now })
    for (const daysAgo of [9, 6, 3]) await logWorkout(daysAgo, [[bench, 60, [6, 6, 6]]], { routineId: 'r' })
    expect(await liftPlateaus(now)).toEqual([]) // 6 of 6: the tip says go up
    await db.routines.delete('r')
    expect(await liftPlateaus(now)).toHaveLength(1) // the usual 8
  })

  it('goes once the lift moves, and a later plateau is a new one', async () => {
    for (const daysAgo of [12, 10, 8]) await logWorkout(daysAgo, [[bench, 60, [6, 6, 6]]])
    const [first] = await liftPlateaus(now)
    await logWorkout(6, [[bench, 60, [7, 6, 6]]])
    expect(await liftPlateaus(now)).toEqual([])
    await logWorkout(4, [[bench, 60, [7, 6, 6]]])
    await logWorkout(2, [[bench, 60, [7, 6, 6]]])
    const [again] = await liftPlateaus(now)
    expect(again.since).not.toBe(first.since)
    expect(again.since).toBe(now - 6 * DAY)
  })

  it('leaves a lift not done for four weeks to the tip’s easing back in', async () => {
    for (const daysAgo of [40, 37, 34]) await logWorkout(daysAgo, [[bench, 60, [6, 6, 6]]])
    expect(await liftPlateaus(now)).toEqual([])
  })

  it('shows while the tips are on and training isn’t paused', async () => {
    const today = toDateStr(new Date(now))
    expect(await showsPlateaus(today)).toBe(true)
    await db.settings.put({ id: 1, workoutTips: false, updatedAt: now } as Settings)
    expect(await showsPlateaus(today)).toBe(false)
    await db.settings.put({ id: 1, updatedAt: now } as Settings)
    await setPause(today, toDateStr(new Date(now + 3 * DAY)))
    expect(await showsPlateaus(today)).toBe(false)
  })
})

describe('plateaus on the summary', () => {
  beforeEach(async () => {
    await resetDb()
    await db.exercises.bulkPut([bench, squat])
  })

  const finished = async (id: string) => {
    const workout = await getWorkoutWithSets(id)
    if (!workout) throw new Error('no workout')
    return workoutPlateaus(workout)
  }

  it('says so only once the finished workout makes enough sessions', async () => {
    await logWorkout(7, [[bench, 60, [6, 6, 6]]])
    const second = await logWorkout(4, [[bench, 60, [6, 6, 6]], [squat, 100, [5, 5, 5]]])
    expect(await finished(second)).toEqual([]) // two sessions: not enough yet
    const third = await logWorkout(0, [[bench, 60, [6, 6, 6]], [squat, 100, [5, 5, 5]]])
    const plateaus = await finished(third)
    expect(plateaus.map(p => p.exerciseId)).toEqual([bench.uuid])
    expect(plateauHint(plateaus[0])).toEqual({
      kind: 'reset',
      title: 'Next time, a reset at 55 kg',
      why: '3 sessions at 60 kg without more reps. Taking some weight off and building back up usually gets past a plateau.',
    })
    // The second workout's summary still reads only the sessions up to it
    expect(await finished(second)).toEqual([])
  })

  it('isn’t a plateau when the reset was taken today', async () => {
    for (const daysAgo of [9, 6, 3]) await logWorkout(daysAgo, [[bench, 60, [6, 6, 6]]])
    expect(await finished(await logWorkout(0, [[bench, 55, [8, 8, 8]]]))).toEqual([])
  })
})
