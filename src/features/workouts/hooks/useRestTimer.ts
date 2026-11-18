import { useCallback, useEffect, useState } from 'react'
import { buzz } from '@/lib/haptics'
import { nativeNotifyState, replaceScheduled, requestNativeNotify } from '@/lib/localNotifications'

const STORAGE_KEY = 'solo:restTimer'

type Persisted = { endAt: number; total: number }

function readPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Persisted
    return p.endAt > Date.now() ? p : null
  } catch {
    return null
  }
}

/** Fired on window whenever the rest timer starts, changes or stops (the workout notification follows it). */
export const REST_EVENT = 'solo:rest'

/** When the running rest ends, or null. */
export const restEndsAt = (): number | null => readPersisted()?.endAt ?? null

function persist(p: Persisted | null): void {
  try {
    if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable — timer still works in memory
  }
  window.dispatchEvent(new Event(REST_EVENT))
}

/** Ask the service worker to show a notification at endAt (works while the app is backgrounded, best-effort). */
function scheduleInServiceWorker(endAt: number | null): void {
  if (!('serviceWorker' in navigator)) return
  void navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage(endAt == null ? { type: 'cancel-rest-alarm' } : { type: 'schedule-rest-alarm', endAt })
  })
}

/** Below the reminders' id range (features/reminders/deliver.ts). */
const REST_ALARM_ID = 9001

/**
 * Android app: a scheduled notification, which still rings with the phone locked or the app
 * in the background (the WebView has no web notifications, and its timers freeze there).
 */
function scheduleOnPhone(endAt: number | null): void {
  const alarm = { id: REST_ALARM_ID, title: 'Rest done', body: 'Time for your next set', at: endAt ?? 0, url: '/workouts/active', channel: 'rest-timer' as const }
  void replaceScheduled(REST_ALARM_ID, REST_ALARM_ID + 1, endAt == null ? [] : [alarm]).catch(() => {})
}

function alertRestDone(): void {
  buzz([200, 100, 200]) // Android; iPhones can't vibrate from a timer
}

/** Must be called from a tap (iOS only shows the prompt in response to a user gesture). */
export function requestNotificationPermission(): void {
  // The Android app asks through the system instead (no web notifications in its WebView)
  void nativeNotifyState().then(state => { if (state === 'prompt') void requestNativeNotify() }).catch(() => {})
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
  void Notification.requestPermission()
}

function save(next: Persisted | null): void {
  persist(next)
  scheduleInServiceWorker(next?.endAt ?? null)
  scheduleOnPhone(next?.endAt ?? null)
}

/** Starts a rest of `seconds` from now, from anywhere: the workout screen, or a button on the watch. */
export function startRest(seconds: number): void {
  if (seconds > 0) save({ endAt: Date.now() + seconds * 1000, total: seconds })
}

export const stopRest = (): void => save(null)

/** Stretches (or shortens) the running rest; nothing without one. */
export function addRestSeconds(delta: number): void {
  const timer = readPersisted()
  if (timer) save({ endAt: timer.endAt + delta * 1000, total: timer.total + delta })
}

/**
 * The rest timer: when it ends, and how to start, stop and stretch it. It doesn't count down
 * itself: that is RestBanner's, so the four ticks a second draw the banner again and not the
 * whole workout screen that holds this.
 */
export function useRestTimer() {
  const [timer, setTimer] = useState<Persisted | null>(readPersisted)

  // Whatever started, changed or stopped it (here, or a button on the watch), this follows
  useEffect(() => {
    const follow = () => setTimer(readPersisted())
    window.addEventListener(REST_EVENT, follow)
    return () => window.removeEventListener(REST_EVENT, follow)
  }, [])

  // Fire once at the end.
  useEffect(() => {
    if (!timer) return
    const left = Math.max(0, timer.endAt - Date.now())
    // With the app on screen its own buzz is enough: drop the phone's notification just before it rings
    const quiet = setTimeout(() => {
      if (document.visibilityState === 'visible') scheduleOnPhone(null)
    }, Math.max(0, left - 800))
    const t = setTimeout(() => {
      alertRestDone()
      persist(null)
      setTimer(null)
    }, left)
    return () => {
      clearTimeout(quiet)
      clearTimeout(t)
    }
  }, [timer])

  // The state follows through REST_EVENT. Not inside a state update function: that runs while the
  // screen is being drawn, and telling the rest of the app (the workout notification) was too early
  const start = useCallback((seconds: number) => startRest(seconds), [])
  const stop = useCallback(() => stopRest(), [])
  const addSeconds = useCallback((delta: number) => addRestSeconds(delta), [])

  return {
    endAt: timer?.endAt ?? null,
    totalSeconds: timer?.total ?? 0,
    start,
    stop,
    addSeconds,
  }
}
