import { useEffect } from 'react'
import { isAndroidApp, soloPlugin } from '@/lib/native'
import { DEFAULT_REST_SECONDS, useSettings } from '@/features/settings/hooks/useSettings'
import { applyWatchAction } from '../watchActions'

/** Mount once (in App). In the Android app, the watch's buttons act on the workout in progress. */
export function useWatchActions(): void {
  const { settings } = useSettings()
  const defaultRest = settings?.defaultRestSeconds ?? DEFAULT_REST_SECONDS
  useEffect(() => {
    if (!isAndroidApp()) return
    let stop = () => {}
    let stopped = false
    void soloPlugin()
      .then(plugin => plugin?.addListener('watchAction', event => applyWatchAction(event.action, defaultRest)))
      .then(handle => {
        if (!handle) return
        if (stopped) void handle.remove()
        else stop = () => void handle.remove()
      })
      .catch(() => {})
    return () => {
      stopped = true
      stop()
    }
  }, [defaultRest])
}
