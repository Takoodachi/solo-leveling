import { Health, type PermissionResponse } from 'capacitor-health'
import { addDays, startOfDay, subDays } from 'date-fns'
import { db } from '@/db'
import { writeSteps } from '@/features/dashboard/hooks/useDailyActivity'
import { requestSync, syncService } from '@/lib/sync'

/**
 * Samsung Health steps, read through Health Connect (Android app only). Import this module
 * lazily behind `isAndroidApp()`: it pulls in the native plugin.
 */

/** How far back each import looks, so a few days without opening the app still fill in. */
const DAYS = 14
const LAST_IMPORT_KEY = 'solo:healthLastImport'
const READ_STEPS = { permissions: ['READ_STEPS' as const] }

export type HealthStatus = 'unavailable' | 'needs-permission' | 'connected'

function stepsGranted(res: PermissionResponse): boolean {
  // Typed as a list of maps, but Android returns a single map: { READ_STEPS: true }
  const maps: unknown[] = Array.isArray(res.permissions) ? res.permissions : [res.permissions]
  return maps.some(m => typeof m === 'object' && m !== null && (m as Record<string, unknown>).READ_STEPS === true)
}

export async function getStatus(): Promise<HealthStatus> {
  const { available } = await Health.isHealthAvailable()
  if (!available) return 'unavailable'
  return stepsGranted(await Health.checkHealthPermissions(READ_STEPS)) ? 'connected' : 'needs-permission'
}

/** Ask for step access on Health Connect's consent screen. Resolves with whether it was granted. */
export async function connect(): Promise<boolean> {
  const { available } = await Health.isHealthAvailable()
  if (!available) return false
  return stepsGranted(await Health.requestHealthPermissions(READ_STEPS))
}

export const openHealthConnectSettings = () => Health.openHealthConnectSettings()
export const getHealthConnect = () => Health.showHealthConnectInPlayStore()

let inFlight: Promise<number> | null = null

/**
 * Import the last DAYS days. Health Connect merges every source (phone, watch) without double
 * counting and totals each local calendar day. A day only changes when the import is higher,
 * so a number typed in by hand is never lowered. Returns how many days changed. Overlapping
 * calls (app resume + the Settings card) share one run.
 */
export function importSteps(): Promise<number> {
  inFlight ??= runImport().finally(() => { inFlight = null })
  return inFlight
}

async function runImport(): Promise<number> {
  // Compare against the latest synced values: a sync in progress (this resume's, or the
  // launch one) may be about to pull a higher number typed in on another device
  await syncService.whenIdle()
  const today = startOfDay(new Date())
  const { aggregatedData } = await Health.queryAggregated({
    startDate: subDays(today, DAYS - 1).toISOString(),
    endDate: addDays(today, 1).toISOString(),
    dataType: 'steps',
    bucket: 'day',
  })
  let updated = 0
  for (const sample of aggregatedData) {
    // Android gives each day's start as a local date-time, e.g. "2026-09-27T00:00"
    const date = String(sample.startDate).slice(0, 10)
    const steps = Math.round(Number(sample.value) || 0)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || steps <= 0) continue
    // Read, compare and write in one transaction so a manual save can't land in between
    const raised = await db.transaction('rw', db.dailyActivity, async () => {
      const existing = await db.dailyActivity.where('date').equals(date).first()
      if (existing && existing.steps >= steps) return false
      await writeSteps(date, steps)
      return true
    })
    if (raised) updated++
  }
  if (updated) requestSync()
  try {
    localStorage.setItem(LAST_IMPORT_KEY, String(Date.now()))
  } catch {
    // only used to show "last import" in Settings
  }
  return updated
}

export function lastImportAt(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_IMPORT_KEY))
    return v > 0 ? v : null
  } catch {
    return null
  }
}
