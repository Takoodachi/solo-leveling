import { isSupabaseConfigured, looseSupabase } from '@/lib/supabase'
import { isAndroidApp, scheduleQuickLogReminders, type QuickLogReminder } from '@/lib/native'
import { nativeNotifyState, replaceScheduled } from '@/lib/localNotifications'
import type { PlannedReminder } from './reminders'

/**
 * Hands the reminder plan to whatever delivers it. In the Android app that's the phone's own
 * scheduled notifications. For every signed-in account it's also the server's `push_queue`,
 * which the push job sends to the account's subscribed browsers and home-screen apps. Both are
 * skipped when the plan hasn't changed since last time.
 */

/** Android app: reminders are switched on for this phone (Settings → Reminders). */
export const NATIVE_ON_KEY = 'solo:notifyOn'
const NATIVE_PLAN_KEY = 'solo:nativePlan'
const QUEUE_PLAN_KEY = 'solo:queuePlan'

/** Notification ids for reminders; the rest timer's sits below the range. */
const ID_FROM = 100_000
const ID_TO = 2_000_000_000

function idOf(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return ID_FROM + (hash % (ID_TO - ID_FROM))
}

const fingerprint = (plan: PlannedReminder[]) => plan.map(p => `${p.key}@${p.at}:${p.title}`).join('|')

/** Reminders whose notification can log the thing itself (a button that works with the app closed). */
const isQuickLog = (p: PlannedReminder): p is PlannedReminder & { kind: QuickLogReminder['kind'] } => p.kind === 'creatine' || p.kind === 'water'

const quickLogItem = (p: PlannedReminder & { kind: QuickLogReminder['kind'] }): QuickLogReminder => ({
  id: idOf(p.key),
  kind: p.kind,
  date: p.key.slice(-10), // keys are kind-YYYY-MM-DD
  at: p.at,
  title: p.title,
  body: p.body,
  url: p.url,
  action: p.kind === 'creatine' ? 'Tick it off' : 'Add a glass',
})

async function toPhone(plan: PlannedReminder[]): Promise<void> {
  if (!isAndroidApp()) return
  const on = localStorage.getItem(NATIVE_ON_KEY) === '1' && (await nativeNotifyState()) === 'granted'
  const wanted = on ? plan : []
  // Creatine and water go to the app's own notifications, with a log button, when this APK has
  // them (cheap, and always sent so an updated APK takes them over); the rest to the plugin
  const quick = await scheduleQuickLogReminders(wanted.filter(isQuickLog).map(quickLogItem)).catch((err: unknown) => {
    console.warn('[reminders] quick-log scheduling failed, using plain notifications:', err)
    return false
  })
  const viaPlugin = quick ? wanted.filter(p => !isQuickLog(p)) : wanted
  // A leading marker, so "on with nothing planned" still differs from "never scheduled"
  const print = `${on ? 'on' : 'off'}|${fingerprint(viaPlugin)}`
  if (localStorage.getItem(NATIVE_PLAN_KEY) === print) return
  await replaceScheduled(ID_FROM, ID_TO, viaPlugin.map(p => ({ id: idOf(p.key), title: p.title, body: p.body, at: p.at, url: p.url, channel: 'reminders' })))
  localStorage.setItem(NATIVE_PLAN_KEY, print)
}

/** The server tables arrive with a migration; until it has run, stop asking for this session. */
let queueMissing = false

async function toQueue(plan: PlannedReminder[], userId: string | null): Promise<void> {
  if (!isSupabaseConfigured || !userId || queueMissing || !navigator.onLine) return
  const print = `${userId}|${fingerprint(plan)}`
  if (localStorage.getItem(QUEUE_PLAN_KEY) === print) return

  const queue = looseSupabase.from('push_queue')
  const rows = plan.map(p => ({ key: p.key, fireAt: p.at, title: p.title, body: p.body, url: p.url }))
  const { error } = rows.length ? await queue.upsert(rows, { onConflict: 'user_id,key' }) : { error: null }
  if (error) {
    // PGRST205 / 42P01: the table doesn't exist yet
    if (error.code === 'PGRST205' || error.code === '42P01') queueMissing = true
    throw error
  }
  // Whatever is no longer planned (done today, switched off, a changed time)
  const stale = queue.delete().eq('user_id', userId)
  const { error: cleanupError } = rows.length ? await stale.not('key', 'in', `(${rows.map(r => `"${r.key}"`).join(',')})`) : await stale
  if (cleanupError) throw cleanupError
  localStorage.setItem(QUEUE_PLAN_KEY, print)
}

export async function deliverPlan(plan: PlannedReminder[], userId: string | null): Promise<void> {
  const results = await Promise.allSettled([toPhone(plan), toQueue(plan, userId)])
  for (const r of results) if (r.status === 'rejected') console.warn('[reminders] delivery failed:', r.reason)
}

/** Forget what was delivered, so the next plan is sent again (after switching notifications on or off). */
export function resetDelivery(): void {
  localStorage.removeItem(NATIVE_PLAN_KEY)
  localStorage.removeItem(QUEUE_PLAN_KEY)
}

/** Signing out: drop what this phone still has scheduled (the account's queue stays for its other devices). */
export async function clearPhoneReminders(): Promise<void> {
  resetDelivery()
  await replaceScheduled(ID_FROM, ID_TO, []).catch(() => {})
  await scheduleQuickLogReminders([]).catch(() => false)
}
