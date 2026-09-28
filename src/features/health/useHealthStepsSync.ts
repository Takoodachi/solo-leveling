import { useEffect } from 'react'
import { isAndroidApp } from '@/lib/native'

const MIN_GAP_MS = 2 * 60_000
let lastRun = 0

/**
 * Mount once (in App). In the Android app, imports Samsung Health steps on launch and whenever
 * the app comes back to the front, once step access has been granted (Settings → Steps). Does
 * nothing in a browser or on iOS. `ready` waits for the session check, so an account switch
 * finishes before anything is written.
 */
export function useHealthStepsSync(ready: boolean): void {
  useEffect(() => {
    if (!ready || !isAndroidApp()) return
    const run = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRun < MIN_GAP_MS) return
      lastRun = Date.now()
      void import('./healthSteps')
        .then(async h => {
          if ((await h.getStatus()) === 'connected') await h.importSteps()
        })
        .catch(err => console.warn('Health Connect step import failed', err))
    }
    run()
    document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [ready])
}
