import { useEffect, useState } from 'react'
import { formatDuration } from '@/lib/format'

/** Seconds since `startedAt` plus an "mm:ss" (or "h:mm:ss") label, ticking every second. */
export function useElapsed(startedAt: number | null): { seconds: number; label: string } {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt == null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const seconds = startedAt == null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000))
  return { seconds, label: formatDuration(seconds) }
}
