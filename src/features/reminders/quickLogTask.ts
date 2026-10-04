import { db } from '@/db'
import { setWater, tickCheckin } from '@/features/checkins/useCheckins'
import { syncInBackground } from '@/features/health/backgroundSteps'
import { DEFAULT_WATER_GLASS_ML, DEFAULT_WATER_GOAL_ML } from '@/features/settings/hooks/useSettings'

/**
 * A reminder's button, pressed with the app closed (Android). The creatine and water
 * reminders carry "Tick it off" / "Add a glass" (android/…/QuickLog.kt). The log lives in the
 * site's IndexedDB, so the button has the app load this page off-screen with the job on
 * `window.SoloBackground`; main.tsx sees `task()` and runs this instead of drawing the app.
 * The answer becomes the notification's text.
 */

export interface QuickLogBridge {
  /** JSON: { kind: 'creatine' | 'water', date: 'YYYY-MM-DD' }. */
  task(): string
  /** JSON: { ok, title, detail }. */
  done(result: string): void
}

export function quickLogBridge(): QuickLogBridge | undefined {
  const bridge = (window as { SoloBackground?: Partial<QuickLogBridge> }).SoloBackground
  return bridge && typeof bridge.task === 'function' && typeof bridge.done === 'function' ? (bridge as QuickLogBridge) : undefined
}

async function log(kind: unknown, date: string): Promise<string> {
  if (kind === 'creatine') return (await tickCheckin('creatine', date)) ? 'Creatine ticked off' : 'Creatine was already ticked off'
  if (kind !== 'water') throw new Error('Unknown reminder')
  const settings = await db.settings.get(1)
  const glass = settings?.waterGlassMl ?? DEFAULT_WATER_GLASS_ML
  const goal = settings?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML
  const total = await setWater(date, ml => ml + glass)
  return `+${glass} ml water · ${total.toLocaleString()} / ${goal.toLocaleString()} ml`
}

export async function runQuickLog(bridge: QuickLogBridge): Promise<void> {
  let result: { ok: boolean; title: string; detail: string }
  try {
    const task = JSON.parse(bridge.task()) as { kind?: unknown; date?: unknown }
    if (typeof task.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(task.date)) throw new Error('No day to log to')
    const title = await log(task.kind, task.date)
    result = { ok: true, title, detail: `Saved${await syncInBackground()}` }
  } catch (err) {
    result = { ok: false, title: 'Couldn’t log it', detail: `${err instanceof Error ? err.message : String(err)}. Open the app to log it.` }
  }
  bridge.done(JSON.stringify(result))
}
