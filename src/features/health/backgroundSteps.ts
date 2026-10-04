import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { syncService } from '@/lib/sync'
import { useSyncStatus } from '@/lib/syncStatus'
import { raiseSteps, type DaySteps } from './stepsWriter'

/**
 * Step sync while the Android app is closed. About once an hour the app's background job
 * (android/…/StepsSyncWorker.kt) reads the day totals from Health Connect and loads this site
 * in a WebView nobody sees, with them on `window.SoloBackground`. main.tsx sees that and runs
 * this instead of drawing the app: save the steps, sync, report back in a sentence.
 */

export interface BackgroundBridge {
  /** JSON: [{ date, steps }] for the last 14 local days. */
  steps(): string
  /** Ends the run; the text is shown in Settings → Steps. */
  done(result: string): void
}

export function backgroundBridge(): BackgroundBridge | undefined {
  return (window as { SoloBackground?: BackgroundBridge }).SoloBackground
}

/** Same key as features/auth/useAuthInit (not imported: that would pull the whole app in). */
const LOCAL_OWNER_KEY = 'solo:localOwner'

/** Sync from the off-screen page; the result reads on after "saved", e.g. " and synced". Also used by quick-log reminders. */
export async function syncInBackground(): Promise<string> {
  if (!isSupabaseConfigured) return ''
  // No connection (a reminder's button pressed offline). Answer now: asking for the session
  // would retry refreshing it for half a minute first
  if (!navigator.onLine) return localStorage.getItem(LOCAL_OWNER_KEY) ? ' on this phone (offline: syncs when the app is next opened)' : ' on this phone (not signed in)'
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return ' on this phone (not signed in)'
  // Another account's data may still be here until the app is opened and switches over
  if (localStorage.getItem(LOCAL_OWNER_KEY) !== userId) return ' on this phone (syncs when the app is next opened)'
  syncService.setUser(userId)
  await syncService.sync(userId)
  const { state, error } = useSyncStatus.getState()
  return state === 'error' ? ` on this phone (sync failed: ${error})` : ' and synced'
}

export async function runBackgroundSteps(bridge: BackgroundBridge): Promise<void> {
  let outcome: string
  try {
    const changed = await raiseSteps(JSON.parse(bridge.steps()) as DaySteps[])
    outcome = changed === 0 ? 'Steps were already up to date' : `${changed} day${changed === 1 ? '' : 's'} updated${await syncInBackground()}`
  } catch (err) {
    outcome = `Stopped: ${err instanceof Error ? err.message : String(err)}`
  }
  bridge.done(outcome)
}
