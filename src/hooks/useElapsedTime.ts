import { useState, useEffect, useRef } from 'react'
import { formatDuration } from '@/lib/format'

export function useElapsedTime(startedAt: number | null): string {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0)
      return
    }

    setElapsed(Math.floor((Date.now() - startedAt) / 1000))

    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startedAt])

  return formatDuration(elapsed)
}
