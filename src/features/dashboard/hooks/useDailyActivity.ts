import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { DailyActivity } from '@/types'
import { requestSync } from '@/lib/sync'

export async function logSteps(date: string, steps: number): Promise<void> {
  const existing = await db.dailyActivity.where('date').equals(date).first()
  const now = Date.now()
  if (existing) {
    await db.dailyActivity.update(existing.uuid, { steps, updatedAt: now, syncPending: true })
  } else {
    const row: DailyActivity = {
      uuid: `steps-${date}`, // one row per day across devices
      date,
      steps,
      updatedAt: now,
      syncPending: true,
    }
    await db.dailyActivity.put(row)
  }
  requestSync()
}

export function useDailyActivity(limit = 90) {
  const entries = useLiveQuery(
    () => db.dailyActivity.orderBy('date').reverse().limit(limit).toArray(),
    [limit],
  )

  return { entries: entries ?? [], logSteps }
}
