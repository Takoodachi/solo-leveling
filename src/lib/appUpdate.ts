import { useWorkoutStore } from '@/features/workouts/store'

/**
 * The app picks up a new version by itself (November 2026, at the owner's request). The service
 * worker (src/sw.ts) installs a new build in the background and takes over at once (skipWaiting,
 * clients.claim), but a page that's already running keeps its old code until it's loaded again,
 * and the Android app's page is only loaded afresh when its process starts: after a release the
 * old version could stay on the phone for days. So the page asks for a new build each time it
 * comes back to the front (at most every 10 minutes) and every hour while it's on screen, and once
 * one has taken over, it loads itself again the next time it goes out of sight, where a reload
 * interrupts nothing. Never with a workout open: that waits until the workout is finished.
 */
const CHECK_GAP_MS = 10 * 60_000
const HOUR_MS = 60 * 60_000

export function keepUpToDate(): void {
  const sw = navigator.serviceWorker
  if (!sw) return
  // A page no service worker ran is a first visit, which installs the first one: nothing old to replace
  const old = !!sw.controller
  let ready = false
  sw.addEventListener('controllerchange', () => {
    if (old) ready = true
  })

  let checked = 0
  const check = () => {
    if (Date.now() - checked < CHECK_GAP_MS) return
    checked = Date.now()
    void sw.getRegistration().then(r => r?.update()).catch(() => {}) // offline, or mid-deploy: next time
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
    else if (ready && !useWorkoutStore.getState().draft) location.reload()
  })
  setInterval(() => {
    if (document.visibilityState === 'visible') check()
  }, HOUR_MS)
}
