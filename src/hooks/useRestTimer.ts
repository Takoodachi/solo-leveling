import { useState, useEffect, useRef, useCallback } from 'react'

export function useRestTimer(defaultSeconds = 90) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const notifRef = useRef<Notification | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRunning(false)
    setSecondsLeft(null)
  }, [])

  const start = useCallback((seconds = defaultSeconds) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSecondsLeft(seconds)
    setIsRunning(true)

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev === null || prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setIsRunning(false)
          // Fire notification if permission granted
          if (Notification.permission === 'granted') {
            notifRef.current = new Notification('Rest done!', {
              body: "Time to hit the next set 💪",
              icon: '/icons/icon-192.png',
              tag: 'rest-timer',
            })
          }
          return null
        }
        return prev - 1
      })
    }, 1000)
  }, [defaultSeconds])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      notifRef.current?.close()
    }
  }, [])

  async function requestPermission() {
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  return { secondsLeft, isRunning, start, stop, requestPermission }
}
