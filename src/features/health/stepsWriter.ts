import { db } from '@/db'
import { writeSteps } from '@/features/dashboard/hooks/useDailyActivity'

export interface DaySteps {
  date: string // YYYY-MM-DD, the local day
  steps: number
}

/**
 * Save day totals read from Health Connect. A day only changes when the import is higher, so
 * a number typed in by hand is never lowered. Returns how many days changed. Used by the
 * import in the open app and by the background sync; neither starts a sync here.
 */
export async function raiseSteps(days: DaySteps[]): Promise<number> {
  let updated = 0
  for (const day of days) {
    const steps = Math.round(Number(day.steps) || 0)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || steps <= 0) continue
    // Read, compare and write in one transaction so a manual save can't land in between
    const raised = await db.transaction('rw', db.dailyActivity, async () => {
      const existing = await db.dailyActivity.where('date').equals(day.date).first()
      if (existing && existing.steps >= steps) return false
      await writeSteps(day.date, steps)
      return true
    })
    if (raised) updated++
  }
  return updated
}
