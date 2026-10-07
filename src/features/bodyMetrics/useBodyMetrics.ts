import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { BodyMetric } from '@/types'
import { requestSync, deleteSynced } from '@/lib/sync'
import { evaluateAchievements } from '@/lib/achievementEval'
import { announceAchievements } from '@/features/gamification/announce'

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
        // One entry per day: a date-based id means two devices logging the same
        // day offline update one row instead of creating duplicates.
        uuid: `weight-${date}`,
        date,
        weightKg,
        notes,
        updatedAt: now,
        syncPending: true,
      }
      await db.bodyMetrics.put(entry)
    }

    await announceAchievements(await evaluateAchievements())

    requestSync()
  }

  async function deleteMetric(uuid: string): Promise<void> {
    await deleteSynced(db.bodyMetrics, 'body_metrics', [uuid])
  }

  return { metrics: metrics ?? [], logWeight, deleteMetric }
}
