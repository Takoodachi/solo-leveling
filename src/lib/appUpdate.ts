import { useWorkoutStore } from '@/features/workouts/store'
import { LATEST_APK } from '@/lib/apkBuild'
import { apkBuild, updateApk } from '@/lib/native'

/**
 * The app picks up a new version by itself (November 2026, at the owner's request). The service
 * worker (src/sw.ts) installs a new build in the background and takes over at once (skipWaiting,
 * clients.claim), but a page that's already running keeps its old code until it's loaded again,
 * and the Android app's page is only loaded afresh when its process starts: after a release the
 * old version could stay on the phone for days. So the page asks for a new build each time it
 * comes back to the front (at most every 10 minutes) and every hour while it's on screen, and once
 * one has taken over, it loads itself again the next time it goes out of sight, where a reload
 * interrupts nothing. Never with a workout open: that waits until the workout is finished.
 *
 * The Android app's own code (the APK) catches up the same way, from build 11 on: while the site
 * knows a newer build (src/lib/apkBuild.ts), the APK is fetched at launch and installed the next
 * time the app goes out of sight with no workout open (AppUpdate.kt). The install closes the app,
 * and a notification opens it again, as the new build on the newest site.
 */
const CHECK_GAP_MS = 10 * 60_000
const HOUR_MS = 60 * 60_000

/** The newest APK: here and waiting to go in, or started (once a page, so a "Cancel" to Android's question isn't asked again before the next launch). */
let apk: 'behind' | 'fetched' | 'started' = 'behind'

/** "Update now" (UpdateAppDialog): the newest APK, installed at once. False in an APK that can't install itself. */
export function installApk(): Promise<boolean> {
  apk = 'started'
  return updateApk(LATEST_APK.build, true)
}

export function keepUpToDate(): void {
  void apkBuild()
    .then(build => build < LATEST_APK.build && updateApk(LATEST_APK.build, false))
    .then(fetched => {
      if (fetched && apk === 'behind') apk = 'fetched'
    })
    .catch(() => {}) // offline, or the release isn't up yet: next launch

  // None on a page that isn't secure (a dev server reached by its address)
  const sw = navigator.serviceWorker as ServiceWorkerContainer | undefined
  // A page no service worker ran is a first visit, which installs the first one: nothing old to replace
  const old = !!sw?.controller
  let ready = false
  sw?.addEventListener('controllerchange', () => {
    if (old) ready = true
  })

  let checked = 0
  const check = () => {
    if (!sw || Date.now() - checked < CHECK_GAP_MS) return
    checked = Date.now()
    void sw.getRegistration().then(r => r?.update()).catch(() => {}) // offline, or mid-deploy: next time
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') return check()
    if (useWorkoutStore.getState().draft) return
    // The new APK comes back on the newest site too, so it goes first
    if (apk === 'fetched') void installApk().catch(() => {})
    else if (ready) location.reload()
  })
  setInterval(() => {
    if (document.visibilityState === 'visible') check()
  }, HOUR_MS)
}
