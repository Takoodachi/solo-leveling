import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db'
import type { BodyMetric } from '@/types'
import { requestSync, deleteSynced } from '@/lib/sync'
import { formatShortDate } from '@/lib/date'
import { evaluateAchievements } from '@/lib/achievementEval'
import { announceAchievements } from '@/features/gamification/announce'

/** Log (or correct) a day's weight. */
export async function logWeight(date: string, weightKg: number, notes = ''): Promise<void> {
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
    // The day's id is its date: if this day was deleted a moment ago, that delete is off
    await db.pendingDeletes.delete(`body_metrics:${entry.uuid}`)
  }

  await announceAchievements(await evaluateAchievements())

  requestSync()
}

export function useBodyMetrics(limit = 90) {
  const metrics = useLiveQuery(
    () => db.bodyMetrics.orderBy('date').reverse().limit(limit).toArray(),
    [limit]
  )

  /** Delete a weigh-in, with an Undo: one tap on a bin shouldn't be final. */
  async function deleteMetric(m: BodyMetric): Promise<void> {
    await deleteSynced(db.bodyMetrics, 'body_metrics', [m.uuid])
    toast(`Removed ${m.weightKg} kg on ${formatShortDate(m.date)}`, {
      action: { label: 'Undo', onClick: () => void logWeight(m.date, m.weightKg, m.notes) },
    })
  }

  return { metrics: metrics ?? [], logWeight, deleteMetric }
}
