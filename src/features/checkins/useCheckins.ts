import { useLiveQuery } from 'dexie-react-hooks'
import { parseISO, subDays } from 'date-fns'
import { db } from '@/db'
import type { CheckinKey } from '@/types'
import { requestSync } from '@/lib/sync'
import { toDateStr } from '@/lib/date'

const idFor = (key: CheckinKey, date: string) => `${key}-${date}`

export function useCheckin(key: CheckinKey, date: string): boolean {
  return useLiveQuery(() => db.checkins.get(idFor(key, date)), [key, date])?.done ?? false
}

/** Tick / untick. Unticking keeps the row (done = false) so it syncs like any edit. */
export async function toggleCheckin(key: CheckinKey, date: string): Promise<boolean> {
  const uuid = idFor(key, date)
  const done = !(await db.checkins.get(uuid))?.done
  await db.checkins.put({ uuid, date, key, done, updatedAt: Date.now(), syncPending: true })
  requestSync()
  return done
}

/** Consecutive days ticked, ending today (or yesterday while today is still open). */
export function useCheckinStreak(key: CheckinKey, today: string): number {
  return useLiveQuery(async () => {
    const rows = await db.checkins.where('key').equals(key).toArray()
    const days = new Set(rows.filter(r => r.done).map(r => r.date))
    let day = parseISO(today)
    if (!days.has(today)) day = subDays(day, 1)
    let streak = 0
    while (days.has(toDateStr(day))) {
      streak++
      day = subDays(day, 1)
    }
    return streak
  }, [key, today]) ?? 0
}
