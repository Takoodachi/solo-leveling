import { useEffect } from 'react'
import { isAndroidApp, soloHas } from '@/lib/native'
import { useSyncStatus } from '@/lib/syncStatus'
import { useWorkoutStore } from '@/features/workouts/store'

const send = () =>
  import('./sendWidgets')
    .then(m => m.sendWidgets())
    .catch((err: unknown) => console.warn('[widgets] not updated:', err))

/**
 * Keeps the Android app's home-screen widgets current (sendWidgets.ts, loaded only in the app): a
 * few seconds after launch, after every sync (each change of one's own goes through one), when a
 * workout starts or ends, and as the app leaves the screen, which is when they're next seen.
 */
export function useWidgetSync(): void {
  useEffect(() => {
    if (!isAndroidApp() || !soloHas('setWidgets')) return
    let timer = 0
    const soon = (ms: number) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void send(), ms)
    }
    soon(3000)
    const stopSync = useSyncStatus.subscribe((s, prev) => {
      if (prev.state === 'syncing' && s.state !== 'syncing') soon(1000)
    })
    const stopDraft = useWorkoutStore.subscribe((s, prev) => {
      if (!!s.draft !== !!prev.draft) soon(1000)
    })
    // Not delayed: the page may be paused a moment after it goes
    const onHide = () => {
      if (document.visibilityState === 'hidden') void send()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.clearTimeout(timer)
      stopSync()
      stopDraft()
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])
}
