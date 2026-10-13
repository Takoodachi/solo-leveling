import { useEffect } from 'react'
import { db } from '@/db'
import { isAndroidApp, soloPlugin } from '@/lib/native'
import { nativeNotifyState } from '@/lib/localNotifications'
import { allowNativeNotifications } from '@/features/reminders/useDeviceNotifications'
import { firstAsk, rememberHealth } from './healthPrefs'

const MIN_GAP_MS = 2 * 60_000
let lastRun = 0
// One run at a time: each question is its own screen, and two at once would land on top of each other
let busy = false

/**
 * The permissions that aren't Health Connect's: notifications (which also switches this phone's
 * reminders on, as the switch in Settings does) and the camera for the barcode scanner. The
 * camera has no "ask" of its own in a WebView: opening it is what makes Android ask, so it is
 * opened and closed again at once.
 */
async function askForDevicePermissions(): Promise<void> {
  // Only while Android hasn't been asked: where it's already allowed, the reminders switch is the user's
  if (firstAsk('notifications') && (await nativeNotifyState()) === 'prompt') await allowNativeNotifications()
  if (navigator.mediaDevices && firstAsk('camera')) {
    await navigator.mediaDevices.getUserMedia({ video: true }).then(
      stream => stream.getTracks().forEach(track => track.stop()),
      () => {}, // said no: the scanner asks again when it's opened
    )
  }
}

/**
 * "Sync in the background", kept in step with the account: noted when it is on here, and asked
 * for (once) on an install where the account says it was on. It is a feature to switch on, not
 * something the app needs, so a fresh install only asks when the account remembers it.
 */
async function keepBackground(): Promise<void> {
  const plugin = await soloPlugin()
  const state = await plugin?.backgroundStepsStatus()
  if (!plugin || !state?.supported) return
  const wanted = (await db.settings.get(1))?.health?.background
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
 * **On a fresh install it asks for everything the app uses, by itself, one question after the
 * other**: notifications, the camera, step access, and background access if the account says
 * that was on (`settings.health`, read after the import, which waits for the first sync).
 * Android forgets all of them when the app is removed, and each used to be found again in
 * Settings. Every question is asked once per install (`firstAsk`) and never again after a no.
 */
export function useHealthStepsSync(ready: boolean): void {
  useEffect(() => {
    if (!ready || !isAndroidApp()) return
    const run = () => {
      if (busy || document.visibilityState !== 'visible' || Date.now() - lastRun < MIN_GAP_MS) return
      busy = true
      void askForDevicePermissions()
        .then(() => import('./healthSteps'))
        .then(async h => {
          let status = await h.getStatus()
          if (status === 'needs-permission' && firstAsk('steps') && (await h.connect())) status = 'connected'
          // The cooldown only starts once step access is granted, so access given in Health
          // Connect's own screen is picked up as soon as you're back
          if (status !== 'connected') return
          lastRun = Date.now()
          await h.importSteps()
          await keepBackground()
        })
        .catch(err => console.warn('Health Connect step import failed', err))
        .finally(() => {
          busy = false
        })
    }
    run()
    document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [ready])
}
