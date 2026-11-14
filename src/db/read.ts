import Dexie, { type Table } from 'dexie'
import type { WorkoutSet } from '@/types'
import { db } from '.'

/**
 * Reading the database without paying for it twice. Measured on a year of logs with the CPU
 * slowed four times (a mid-range phone): a read that walks its rows one at a time (`filter`,
 * `anyOf`) takes five to fifteen times as long as one that asks for them in a single request,
 * and the ranks alone took 2.4 s, worked out again by four callers after every food logged.
 */

// How many commits have written to each table, here or in another tab. Dexie reports a commit
// before the write's own promise resolves, so a read after `await put()` already sees it counted.
const writes: Record<string, number> = {}
Dexie.on('storagemutated', parts => {
  // A part is "idb://<database>/<table>/<index>"
  for (const table of new Set(Object.keys(parts).map(part => part.split('/')[3]))) writes[table] = (writes[table] ?? 0) + 1
})

/** What these helpers need of a table, whatever its rows are. */
interface AnyTable {
  name: string
  limit(n: number): { toArray(): PromiseLike<unknown[]> }
}

/** Goes up every time the table is written. */
export const writesTo = (table: { name: string }): number => writes[table.name] ?? 0

/**
 * `load`'s result, kept until one of the tables it reads is written. For what is worked out
 * from whole tables and asked for again and again with nothing changed. The result is shared:
 * don't change it. Only a finished result is kept, never one still loading, because a live
 * query that waits on another caller's reads loses track of its own.
 */
export function cached<T>(tables: AnyTable[], load: () => Promise<T>): () => Promise<T> {
  let kept: { at: string; value: T } | undefined
  return async () => {
    // For a live query handed the kept result: Dexie watches the range a read asks for, not the
    // rows it gets, so one row of each table is what makes it run again when any row changes
    await Promise.all(tables.map(t => t.limit(1).toArray()))
    const at = tables.map(writesTo).join()
    if (kept?.at === at) return kept.value
    const value = await load()
    kept = { at, value } // `at` is from before the load, so a write during it means loading again
    return value
  }
}

const byId = <T extends { uuid: string }>(table: Table<T, string>) =>
  cached([table], async (): Promise<ReadonlyMap<string, T>> => new Map((await table.toArray()).map(row => [row.uuid, row])))

// A whole small table in one request, by id. Asking for many rows by id (`bulkGet`) is a request
// per row: slower than this from a few dozen ids up, and these are asked for all the time.
export const exercisesById = byId(db.exercises)
export const workoutsById = byId(db.workouts)
export const foodsById = byId(db.foods)

/** Every logged set. */
export const allSets = cached([db.workoutSets], (): Promise<readonly WorkoutSet[]> => db.workoutSets.toArray())

/** The sets of these workouts: a request per workout, or the whole table once that's quicker. */
export async function setsOfWorkouts(ids: string[]): Promise<WorkoutSet[]> {
  if (ids.length > 60) {
    const wanted = new Set(ids)
    return (await allSets()).filter(s => wanted.has(s.workoutId))
  }
  return (await Promise.all(ids.map(id => db.workoutSets.where('workoutId').equals(id).toArray()))).flat()
}
