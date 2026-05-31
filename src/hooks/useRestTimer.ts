import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from '@/db'

const STORAGE_KEY = 'solo:restTimerEndAt'

function persistEndAt(endAt: number | null): void {
  try {
    if (endAt == null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, String(endAt))
  } catch {
    // Ignore quota / private-mode errors
  }
  // Mirror into the active draft row so a refresh restores it.
  void (async () => {
    try {
      const existing = await db.workoutDrafts.get(1)
      if (!existing) return
      await db.workoutDrafts.put({ ...existing, restTimerEndAt: endAt, updatedAt: Date.now() })
    } catch {
      // Ignore — table may not exist on a stale install before the v7 upgrade ran
    }
  })()
}

function readPersistedEndAt(): number | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (!v) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function postScheduleToSW(endAt: number | null): void {
  if (!('serviceWorker' in navigator)) return
  void navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage({
      type: endAt == null ? 'cancel-rest-alarm' : 'schedule-rest-alarm',
      endAt,
    })
  })
}

function fireForegroundNotification(): void {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  // Prefer the SW-bound notification (works while page is backgrounded too).
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.ready.then(reg => {
      void reg.showNotification('Rest done!', {
        body: 'Time to hit the next set 💪',
        icon: '/icons/icon-192.png',
        tag: 'rest-timer',
      })
    }).catch(() => {
      try {
        new Notification('Rest done!', { body: 'Time to hit the next set 💪', tag: 'rest-timer' })
      } catch {
        // ignore
      }
    })
    return
  }
  try {
    new Notification('Rest done!', { body: 'Time to hit the next set 💪', tag: 'rest-timer' })
  } catch {
    // ignore
  }
}

export function useRestTimer(defaultSeconds = 90) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [totalSeconds, setTotalSeconds] = useState<number>(defaultSeconds)
  const endAtRef = useRef<number | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fireRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef<boolean>(false)

  const tearDown = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    if (fireRef.current) { clearTimeout(fireRef.current); fireRef.current = null }
  }, [])

  const reset = useCallback(() => {
    tearDown()
    endAtRef.current = null
    firedRef.current = false
    setSecondsLeft(null)
    persistEndAt(null)
    postScheduleToSW(null)
  }, [tearDown])

  const tickFromEndAt = useCallback(() => {
    const endAt = endAtRef.current
    if (endAt == null) return
    const ms = endAt - Date.now()
    if (ms <= 0) {
      tearDown()
      setSecondsLeft(0)
      endAtRef.current = null
      persistEndAt(null)
      postScheduleToSW(null)
      if (!firedRef.current) {
        firedRef.current = true
        fireForegroundNotification()
      }
      // Auto-clear the visible state shortly after so the banner can hide itself.
      window.setTimeout(() => {
        setSecondsLeft(prev => (prev === 0 ? null : prev))
      }, 300)
      return
    }
    setSecondsLeft(Math.ceil(ms / 1000))
  }, [tearDown])

  const start = useCallback((seconds = defaultSeconds) => {
    tearDown()
    firedRef.current = false
    const endAt = Date.now() + seconds * 1000
    endAtRef.current = endAt
    setTotalSeconds(seconds)
    setSecondsLeft(seconds)
    persistEndAt(endAt)
    postScheduleToSW(endAt)
    tickRef.current = setInterval(tickFromEndAt, 250)
    fireRef.current = setTimeout(() => {
      // Foreground-side firing as a fallback to the SW alarm. The tick will
      // also clear state when it sees endAt <= 0.
      if (!firedRef.current) {
        firedRef.current = true
        fireForegroundNotification()
      }
    }, seconds * 1000)
  }, [defaultSeconds, tearDown, tickFromEndAt])

  const stop = useCallback(() => {
    reset()
  }, [reset])

  const addSeconds = useCallback((delta: number) => {
    if (endAtRef.current == null) return
    const newEndAt = endAtRef.current + delta * 1000
    endAtRef.current = newEndAt
    setTotalSeconds(prev => Math.max(prev, Math.ceil((newEndAt - Date.now()) / 1000)))
    persistEndAt(newEndAt)
    postScheduleToSW(newEndAt)
    if (fireRef.current) clearTimeout(fireRef.current)
    fireRef.current = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        fireForegroundNotification()
      }
    }, Math.max(0, newEndAt - Date.now()))
    tickFromEndAt()
  }, [tickFromEndAt])

  // Resume from a persisted endAt on mount (page refresh / cold start during a workout).
  useEffect(() => {
    const persisted = readPersistedEndAt()
    if (persisted == null) return
    if (persisted <= Date.now()) {
      // Already expired by the time the page came back — fire and clear.
      persistEndAt(null)
      postScheduleToSW(null)
      if (Notification?.permission === 'granted') fireForegroundNotification()
      return
    }
    endAtRef.current = persisted
    setTotalSeconds(Math.ceil((persisted - Date.now()) / 1000))
    setSecondsLeft(Math.ceil((persisted - Date.now()) / 1000))
    tickRef.current = setInterval(tickFromEndAt, 250)
    fireRef.current = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        fireForegroundNotification()
      }
    }, persisted - Date.now())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When the page becomes visible again, force an immediate tick so the UI
  // catches up (browsers throttle setInterval in hidden tabs).
  useEffect(() => {
    function onVis() { if (document.visibilityState === 'visible') tickFromEndAt() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [tickFromEndAt])

  useEffect(() => {
    return () => { tearDown() }
  }, [tearDown])

  async function requestPermission() {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  const isRunning = secondsLeft != null && secondsLeft > 0

  return { secondsLeft, totalSeconds, isRunning, start, stop, addSeconds, requestPermission }
}
