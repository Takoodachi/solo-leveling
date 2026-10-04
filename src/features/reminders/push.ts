import { isSupabaseConfigured, looseSupabase } from '@/lib/supabase'

/**
 * Web push for browsers and the iOS home-screen app (the Android app schedules its own
 * notifications instead). A device subscribes with the server's public VAPID key and saves the
 * subscription in `push_subscriptions`; the server sends what's due from `push_queue`
 * (supabase/functions/send-reminders). Without the key in the build, push is simply not offered.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
const REFRESHED_KEY = 'solo:pushRefreshedAt'
const REFRESH_EVERY_MS = 24 * 60 * 60_000

export const isPushConfigured = Boolean(VAPID_PUBLIC_KEY) && isSupabaseConfigured

/** `needs-install`: an iPhone or iPad in Safari, where push only exists for the home-screen app. */
export function pushSupport(): 'ok' | 'needs-install' | 'unsupported' {
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'ok'
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return apple ? 'needs-install' : 'unsupported'
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

/** This device's subscription, if it has one. Null in dev (no service worker) and wherever push doesn't exist. */
export async function pushSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ok') return null
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

async function save(subscription: PushSubscription): Promise<void> {
  const { endpoint, keys } = subscription.toJSON()
  const { error } = await looseSupabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh: keys?.p256dh, auth: keys?.auth, updatedAt: Date.now() }, { onConflict: 'endpoint' })
  if (error) throw error
  localStorage.setItem(REFRESHED_KEY, String(Date.now()))
}

/** Ask for permission (must run inside a tap) and subscribe this device. */
export async function subscribePush(): Promise<'on' | 'blocked' | 'failed'> {
  if (!VAPID_PUBLIC_KEY || pushSupport() !== 'ok') return 'failed'
  if ((await Notification.requestPermission()) !== 'granted') return 'blocked'
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return 'failed'
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) })
    await save(subscription)
    return 'on'
  } catch (err) {
    console.warn('[push] subscribing failed:', err)
    return 'failed'
  }
}

/** Stop push on this device. The endpoint dies with the subscription, so a row left behind is harmless. */
export async function unsubscribePush(): Promise<void> {
  const subscription = await pushSubscription().catch(() => null)
  if (!subscription) return
  await subscription.unsubscribe().catch(() => false)
  await looseSupabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint).then(() => {}, () => {})
}

/** Once a day, re-save the subscription: the server drops ones it hasn't heard from in two months. */
export async function refreshPushSubscription(): Promise<void> {
  if (!isPushConfigured || Date.now() - Number(localStorage.getItem(REFRESHED_KEY) ?? 0) < REFRESH_EVERY_MS) return
  const subscription = await pushSubscription()
  if (subscription) await save(subscription)
}
