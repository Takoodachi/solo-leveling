import { addDays, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { toDateStr } from '@/lib/date'
import { requestSync } from '@/lib/sync'

/**
 * Pausing training (Workouts → Plan; November 2026, at the owner's request): the weekly plan steps
 * aside for a while and comes back by itself. A pause is a check-in on each of its days
 * (`pause-YYYY-MM-DD`), so every one of them is like a skipped day: no dot, card or workout and
 * stretching reminders, and a day off for the quest, the training-day carbs, the targets check-in
 * and the recap. One row a day rather than a setting: rows sync one by one, past pauses stay known
 * to the recap and the check-in, and the server needs nothing new.
 */

const nextDay = (day: string) => toDateStr(addDays(parseISO(day), 1))

/**
 * Pause from `today` up to, not including, `until` (the day the plan comes back), or end it today
 * with null. Changes only today and the days after it: the days already paused stay paused.
 */
export async function setPause(today: string, until: string | null): Promise<void> {
  const ahead = await db.checkins.where('date').aboveOrEqual(today).toArray()
  const done = new Map(ahead.filter(c => c.key === 'pause' && c.done).map(c => [c.date, false]))
  for (let day = today; until && day < until; day = nextDay(day)) done.set(day, true)
  const now = Date.now()
  await db.checkins.bulkPut([...done].map(([date, on]) => ({ uuid: `pause-${date}`, date, key: 'pause' as const, done: on, updatedAt: now, syncPending: true })))
  requestSync()
}

/** When `date` is paused, the day the plan comes back (YYYY-MM-DD): the end of the pause it's in. Null when it isn't. */
export async function pausedUntil(date: string): Promise<string | null> {
  const ahead = await db.checkins.where('date').aboveOrEqual(date).toArray()
  const paused = new Set(ahead.filter(c => c.key === 'pause' && c.done).map(c => c.date))
  let day = date
  while (paused.has(day)) day = nextDay(day)
  return day === date ? null : day
}

/** `pausedUntil`, live (undefined while it's read). */
export const usePausedUntil = (date: string) => useLiveQuery(() => pausedUntil(date), [date])
