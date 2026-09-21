import { useEffect, useRef } from 'react'

interface WakeLockSentinelLike {
  released: boolean
  release(): Promise<void>
  addEventListener(type: 'release', listener: () => void): void
}

interface WakeLockNavigator {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> }
}

/**
 * Hold a screen wake lock while `active` is true.
 * Silent no-op on browsers without the Wake Lock API (Safari < 16.4, some embedded webviews).
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null)

  useEffect(() => {
    const nav = navigator as unknown as WakeLockNavigator
    if (!active || !nav.wakeLock) return

    let cancelled = false

    async function acquire() {
      try {
        const sentinel = await nav.wakeLock!.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        sentinelRef.current = sentinel
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null
        })
      } catch {
        // Permission denied or transient failure — best-effort, ignore.
      }
    }

    void acquire()

    function onVisible() {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        void acquire()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      const s = sentinelRef.current
      if (s && !s.released) void s.release()
      sentinelRef.current = null
    }
  }, [active])
}
