import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { BodyMetric } from '@/types'
import { syncService } from '@/lib/sync'
import { useAuthStore } from '@/features/auth/authStore'

export function useBodyMetrics(limit = 90) {
  const metrics = useLiveQuery(
    () => db.bodyMetrics.orderBy('date').reverse().limit(limit).toArray(),
    [limit]
  )

  async function logWeight(date: string, weightKg: number, notes = ''): Promise<void> {
    const existing = await db.bodyMetrics.where('date').equals(date).first()
    const now = Date.now()

    if (existing) {
      await db.bodyMetrics.update(existing.uuid, { weightKg, notes, updatedAt: now, syncPending: true })
    } else {
      const entry: BodyMetric = {
        uuid: crypto.randomUUID(),
        date,
        weightKg,
        notes,
        updatedAt: now,
        syncPending: true,
      }
      await db.bodyMetrics.add(entry)
    }

    const userId = useAuthStore.getState().userId
    if (userId) void syncService.sync(userId)
  }

  async function deleteMetric(uuid: string): Promise<void> {
    await db.bodyMetrics.delete(uuid)
  }

  return { metrics: metrics ?? [], logWeight, deleteMetric }
}
