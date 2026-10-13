import { useEffect } from 'react'
import { isAndroidApp, soloPlugin } from '@/lib/native'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { firstAsk, rememberHealth } from './healthPrefs'

const MIN_GAP_MS = 2 * 60_000
let lastRun = 0

/**
 * "Sync in the background", kept in step with the account: noted when it is on here, and asked
 * for (once) on an install where the account says it was on.
 */
async function keepBackground(wanted: boolean | undefined): Promise<void> {
  const plugin = await soloPlugin()
  const state = await plugin?.backgroundStepsStatus()
  if (!plugin || !state?.supported) return
  if (state.enabled) {
    if (wanted === undefined) await rememberHealth({ background: true })
  } else if (wanted && firstAsk('background')) {
    await plugin.enableBackgroundSteps()
  }
}

/**
 * Mount once (in App). In the Android app, imports Samsung Health steps on launch and whenever
 * the app comes back to the front, once step access has been granted. Does nothing in a browser
 * or on iOS. `ready` waits for the session check, so an account switch finishes before anything
 * is written.
 *
 * The account remembers that the link was made (`settings.health`, see `healthPrefs`). On an
 * install without access where the account says there was some (a reinstall, once the first
 * sync has brought the settings), this asks for it by itself, one time.
 */
export function useHealthStepsSync(ready: boolean): void {
  const { settings } = useSettings()
  const steps = settings?.health?.steps === true
  const background = settings?.health?.background
  useEffect(() => {
    if (!ready || !isAndroidApp()) return
    const run = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRun < MIN_GAP_MS) return
      void import('./healthSteps')
        .then(async h => {
          let status = await h.getStatus()
          if (status === 'needs-permission' && steps && firstAsk('steps') && (await h.connect())) status = 'connected'
          // The cooldown only starts once step access is granted, so access given in Health
          // Connect's own screen is picked up as soon as you're back
          if (status !== 'connected') return
          lastRun = Date.now()
          if (!steps) await rememberHealth({ steps: true })
          await h.importSteps()
          await keepBackground(background)
        })
        .catch(err => console.warn('Health Connect step import failed', err))
    }
    run()
    document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [ready, steps, background])
}
