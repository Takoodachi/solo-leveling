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

function persist(p: Persisted | null): void {
  try {
    if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable — timer still works in memory
  }
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

export function useRestTimer() {
  const [timer, setTimer] = useState<Persisted | null>(readPersisted)
  const [now, setNow] = useState(() => Date.now())

  // Tick while running. Derived from endAt so throttled/background tabs catch up instantly.
  useEffect(() => {
    if (!timer) return
    const id = setInterval(() => setNow(Date.now()), 250)
    const onVisible = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [timer])

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

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return
    const next = { endAt: Date.now() + seconds * 1000, total: seconds }
    persist(next)
    scheduleInServiceWorker(next.endAt)
    scheduleOnPhone(next.endAt)
    setNow(Date.now())
    setTimer(next)
  }, [])

  const stop = useCallback(() => {
    persist(null)
    scheduleInServiceWorker(null)
    scheduleOnPhone(null)
    setTimer(null)
  }, [])

  const addSeconds = useCallback((delta: number) => {
    setTimer(prev => {
      if (!prev) return prev
      const next = { endAt: prev.endAt + delta * 1000, total: prev.total + delta }
      persist(next)
      scheduleInServiceWorker(next.endAt)
      scheduleOnPhone(next.endAt)
      return next
    })
  }, [])

  const secondsLeft = timer ? Math.max(0, Math.ceil((timer.endAt - now) / 1000)) : null

  return {
    secondsLeft,
    totalSeconds: timer?.total ?? 0,
    isRunning: secondsLeft != null && secondsLeft > 0,
    start,
    stop,
    addSeconds,
  }
}
