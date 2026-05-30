import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { DailyActivity } from '@/types'
import { syncService } from '@/lib/sync'
import { useAuthStore } from '@/features/auth/authStore'

export function useDailyActivity(limit = 90) {
  const entries = useLiveQuery(
    () => db.dailyActivity.orderBy('date').reverse().limit(limit).toArray(),
    [limit],
  )

  async function logSteps(date: string, steps: number): Promise<void> {
    const existing = await db.dailyActivity.where('date').equals(date).first()
    const now = Date.now()
    if (existing) {
      await db.dailyActivity.update(existing.uuid, { steps, updatedAt: now, syncPending: true })
    } else {
      const row: DailyActivity = {
        uuid: crypto.randomUUID(),
        date,
        steps,
        updatedAt: now,
        syncPending: true,
      }
      await db.dailyActivity.add(row)
    }
    const userId = useAuthStore.getState().userId
    if (userId) void syncService.sync(userId)
  }

  return { entries: entries ?? [], logSteps }
}
