import { isAndroidApp } from './native'

/**
 * Notifications the Android app schedules itself (reminders, the rest timer), so they fire with
 * the app closed and no server. Browsers and the iOS home-screen app use web push instead
 * (features/reminders/push.ts). Everything here resolves quietly outside the Android app, and
 * in an APK built before the plugin was added (`missing`).
 */

export type NativeNotifyState = 'granted' | 'denied' | 'prompt' | 'missing'

export interface NativeNotification {
  id: number
  title: string
  body: string
  at: number
  /** Opened when the notification is tapped. */
  url: string
  channel: 'reminders' | 'rest-timer'
}

let channelsReady = false

/**
 * The plugin, boxed: a Capacitor plugin is a proxy that answers every property, `then`
 * included, so a promise must never resolve to one (it would call LocalNotifications.then()).
 */
async function plugin() {
  if (!isAndroidApp()) return null
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isPluginAvailable('LocalNotifications')) return null
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  if (!channelsReady) {
    channelsReady = true
    await LocalNotifications.createChannel({ id: 'reminders', name: 'Reminders', importance: 3 })
    await LocalNotifications.createChannel({ id: 'rest-timer', name: 'Rest timer', importance: 4, vibration: true })
  }
  return { api: LocalNotifications }
}

export async function nativeNotifyState(): Promise<NativeNotifyState> {
  const p = (await plugin())?.api
  if (!p) return 'missing'
  const { display } = await p.checkPermissions()
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
}

/** Shows Android's permission prompt when it still can. Resolves with whether notifications are allowed. */
export async function requestNativeNotify(): Promise<boolean> {
  const p = (await plugin())?.api
  if (!p) return false
  return (await p.requestPermissions()).display === 'granted'
}

/** Cancel what's pending with ids in [from, to), then schedule `items`. */
export async function replaceScheduled(from: number, to: number, items: NativeNotification[]): Promise<void> {
  const p = (await plugin())?.api
  if (!p) return
  const stale = (await p.getPending()).notifications.filter(n => n.id >= from && n.id < to)
  if (stale.length) await p.cancel({ notifications: stale.map(n => ({ id: n.id })) })
  if (items.length === 0) return
  await p.schedule({
    notifications: items.map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      channelId: n.channel,
      // Exact, and through Doze: a rest timer that rings a few minutes late is useless
      schedule: { at: new Date(n.at), allowWhileIdle: true },
      extra: { url: n.url },
    })),
  })
}

/** Runs `open` with the notification's url when one is tapped. Returns a function that stops listening. */
export function onNativeNotificationTap(open: (url: string) => void): () => void {
  let stop = () => {}
  let stopped = false
  void plugin()
    .then(p => p?.api.addListener('localNotificationActionPerformed', event => {
      const url = (event.notification.extra as { url?: unknown } | undefined)?.url
      if (typeof url === 'string') open(url)
    }))
    .then(handle => {
      if (!handle) return
      if (stopped) void handle.remove()
      else stop = () => void handle.remove()
    })
    .catch(() => {})
  return () => {
    stopped = true
    stop()
  }
}
