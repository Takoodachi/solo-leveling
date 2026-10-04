import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAppShortcut } from '@/lib/native'
import { onNativeNotificationTap } from '@/lib/localNotifications'
import { useWorkoutStore } from '@/features/workouts/store'

/**
 * Mount once, inside the router. Opens the screen a tap outside the app asked for: a
 * notification (the Android app's own, or a web push handed over by the service worker) or a
 * long-press app shortcut.
 */
export function useNativeLinks(): void {
  const navigate = useNavigate()
  useEffect(() => {
    const open = (path: string) => {
      if (!path.startsWith('/')) return
      // "Start workout" with one already running goes back to it
      navigate(path === '/workouts?start=1' && useWorkoutStore.getState().draft ? '/workouts/active' : path)
    }
    const stopTaps = onNativeNotificationTap(open)
    const stopShortcuts = onAppShortcut(open)
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: unknown } | undefined
      if (data?.type === 'open-url' && typeof data.url === 'string') open(data.url)
    }
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () => {
      stopTaps()
      stopShortcuts()
      navigator.serviceWorker?.removeEventListener('message', onMessage)
    }
  }, [navigate])
}
