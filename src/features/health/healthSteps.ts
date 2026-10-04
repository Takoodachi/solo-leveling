import { Health, type PermissionResponse } from 'capacitor-health'
import { addDays, startOfDay, subDays } from 'date-fns'
import { requestSync, syncService } from '@/lib/sync'
import { raiseSteps } from './stepsWriter'

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
  // Android gives each day's start as a local date-time, e.g. "2026-09-27T00:00"
  const updated = await raiseSteps(aggregatedData.map(d => ({ date: String(d.startDate).slice(0, 10), steps: Number(d.value) || 0 })))
  if (updated) requestSync()
  try {
    localStorage.setItem(LAST_IMPORT_KEY, String(Date.now()))
  } catch {
    // only used to show "last import" in Settings
  }
  return updated
}

const APP_NAMES: Record<string, string> = {
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.samsung.android.wear.shealth': 'Galaxy Watch',
  'com.google.android.apps.fitness': 'Google Fit',
  'com.google.android.apps.healthdata': 'Health Connect',
}

// Android 16 counts steps itself and writes them as com.android.healthconnect.phone.<device id>
const appName = (id: string) =>
  APP_NAMES[id] ?? (id.startsWith('com.android.healthconnect.phone') ? 'This phone’s step counter' : id)

export interface StepsDiagnosis {
  /** Health Connect's daily totals (every app, without double counting), newest first. */
  days: { date: string; steps: number }[]
  /** The raw step entries over the same days, by the app that wrote them. */
  sources: { app: string; steps: number; lastAt: number }[]
}

/**
 * What Health Connect holds for the last `days` days, for Settings → Steps. Tells "Samsung
 * Health isn't sharing steps" (no entries at all) apart from an import problem.
 */
export async function diagnose(days = 3): Promise<StepsDiagnosis> {
  const today = startOfDay(new Date())
  const range = { startDate: subDays(today, days - 1).toISOString(), endDate: addDays(today, 1).toISOString() }
  const [{ aggregatedData }, { records }] = await Promise.all([
    Health.queryAggregated({ ...range, dataType: 'steps', bucket: 'day' }),
    Health.queryRecords({ ...range, dataType: 'steps' }),
  ])
  const bySource = new Map<string, { steps: number; lastAt: number }>()
  for (const r of records) {
    // By name, so the phone's counter stays one line if its id changes
    const app = appName(r.sourceBundleId)
    const s = bySource.get(app) ?? { steps: 0, lastAt: 0 }
    s.steps += Number(r.value) || 0
    s.lastAt = Math.max(s.lastAt, Date.parse(r.endDate) || 0)
    bySource.set(app, s)
  }
  return {
    days: aggregatedData
      .map(d => ({ date: String(d.startDate).slice(0, 10), steps: Math.round(Number(d.value) || 0) }))
      .reverse(),
    sources: [...bySource]
      .map(([app, s]) => ({ app, steps: Math.round(s.steps), lastAt: s.lastAt }))
      .sort((a, b) => b.steps - a.steps),
  }
}

export function lastImportAt(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_IMPORT_KEY))
    return v > 0 ? v : null
  } catch {
    return null
  }
}
