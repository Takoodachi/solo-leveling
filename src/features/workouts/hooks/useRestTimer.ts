import { useCallback, useEffect, useState } from 'react'

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

function alertRestDone(): void {
  navigator.vibrate?.([200, 100, 200]) // Android; iOS ignores vibration from the web
}

/** Must be called from a tap (iOS only shows the prompt in response to a user gesture). */
export function requestNotificationPermission(): void {
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
    const t = setTimeout(() => {
      alertRestDone()
      persist(null)
      setTimer(null)
    }, Math.max(0, timer.endAt - Date.now()))
    return () => clearTimeout(t)
  }, [timer])

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return
    const next = { endAt: Date.now() + seconds * 1000, total: seconds }
    persist(next)
    scheduleInServiceWorker(next.endAt)
    setNow(Date.now())
    setTimer(next)
  }, [])

  const stop = useCallback(() => {
    persist(null)
    scheduleInServiceWorker(null)
    setTimer(null)
  }, [])

  const addSeconds = useCallback((delta: number) => {
    setTimer(prev => {
      if (!prev) return prev
      const next = { endAt: prev.endAt + delta * 1000, total: prev.total + delta }
      persist(next)
      scheduleInServiceWorker(next.endAt)
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
