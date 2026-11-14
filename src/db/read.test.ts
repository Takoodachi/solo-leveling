import { beforeEach, describe, expect, it } from 'vitest'
import { liveQuery } from 'dexie'
import { db } from '@/db'
import { resetDb } from '@/test/db'
import { cached, setsOfWorkouts, workoutsById, writesTo } from './read'

const workout = (uuid: string) => ({ uuid, date: '2026-11-01', notes: '', durationMin: 30, createdAt: 1, updatedAt: 1 })
const set = (uuid: string, workoutId: string) => ({ uuid, workoutId, exerciseId: 'ex-a', setIndex: 0, reps: 5, weight: 50, updatedAt: 1 })

/** Waits for something a live query does a moment later. */
async function until(done: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !done(); i++) await new Promise(resolve => setTimeout(resolve, 5))
}

describe('cached', () => {
  beforeEach(resetDb)

  it('keeps a result until one of its tables is written', async () => {
    let loads = 0
    const count = cached([db.workouts], async () => {
      loads++
      return db.workouts.count()
    })
    expect(await count()).toBe(0)
    expect(await count()).toBe(0)
    expect(loads).toBe(1)

    await db.checkins.put({ uuid: 'creatine-2026-11-01', date: '2026-11-01', key: 'creatine', done: true, updatedAt: 1 })
    await count()
    expect(loads).toBe(1) // another table: nothing to read again

    await db.workouts.put(workout('w1'))
    expect(await count()).toBe(1)
    expect(loads).toBe(2)
  })

  it('has a write counted by the time the write returns, once per commit', async () => {
    const before = writesTo(db.workouts)
    await db.workouts.put(workout('w1'))
    expect(writesTo(db.workouts)).toBe(before + 1)
    await db.transaction('rw', db.workouts, async () => {
      await db.workouts.put(workout('w2'))
      await db.workouts.put(workout('w3'))
    })
    expect(writesTo(db.workouts)).toBe(before + 2)
  })

  it('runs a live query again when it was handed a kept result', async () => {
    await db.workouts.put(workout('w1'))
    await workoutsById() // kept from here on: the live query below reads nothing but one row
    const seen: number[] = []
    const subscription = liveQuery(async () => (await workoutsById()).size).subscribe(n => seen.push(n))
    await until(() => seen.length === 1)
    await db.workouts.put(workout('w2'))
    await until(() => seen.length === 2)
    subscription.unsubscribe()
    expect(seen).toEqual([1, 2])
  })
})

describe('setsOfWorkouts', () => {
  beforeEach(resetDb)

  it('finds the sets of a few workouts, of many and of none', async () => {
    const ids = Array.from({ length: 70 }, (_, i) => `w${i}`)
    await db.workoutSets.bulkPut(ids.flatMap(id => [set(`${id}-a`, id), set(`${id}-b`, id)]))
    expect((await setsOfWorkouts(ids.slice(0, 2))).map(s => s.uuid).sort()).toEqual(['w0-a', 'w0-b', 'w1-a', 'w1-b'])
    expect(await setsOfWorkouts(ids)).toHaveLength(140)
    expect((await setsOfWorkouts(ids.slice(0, 65))).every(s => Number(s.workoutId.slice(1)) < 65)).toBe(true)
    expect(await setsOfWorkouts([])).toEqual([])
  })
})
