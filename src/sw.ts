/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null }>
}

// 1. Precache app shell (Vite injects __WB_MANIFEST at build time).
precacheAndRoute(self.__WB_MANIFEST ?? [])
cleanupOutdatedCaches()

// 2. SPA routing offline: any in-app navigation (e.g. reopening /workouts/active
//    with no signal at the gym) is answered with the cached index.html.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// 3. Runtime cache for Open Food Facts barcode lookups.
registerRoute(
  ({ url }) => url.origin === 'https://world.openfoodfacts.org',
  new NetworkFirst({
    cacheName: 'open-food-facts',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 })],
  }),
)

// 4. Rest-timer alarm. The page posts { type: 'schedule-rest-alarm', endAt } so the
//    notification can still fire while the app is in the background. Best-effort:
//    the OS may suspend the worker (the page-side timer + vibration is the backup).
let restAlarm: ReturnType<typeof setTimeout> | null = null

function clearRestAlarm() {
  if (restAlarm) clearTimeout(restAlarm)
  restAlarm = null
}

async function showRestDone() {
  try {
    await self.registration.showNotification('Rest done', {
      body: 'Time for your next set 💪',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'rest-timer',
    })
  } catch {
    // Notifications not permitted — ignore.
  }
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string; endAt?: number } | undefined
  if (data?.type === 'schedule-rest-alarm' && typeof data.endAt === 'number') {
    clearRestAlarm()
    const ms = data.endAt - Date.now()
    if (ms <= 0) return
    restAlarm = setTimeout(async () => {
      restAlarm = null
      // Only notify when no app window is visible (the page handles the foreground case).
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (!windows.some(w => w.visibilityState === 'visible')) await showRestDone()
    }, ms)
  } else if (data?.type === 'cancel-rest-alarm') {
    clearRestAlarm()
  }
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const client = clients[0]
      if (client) return client.focus()
      return self.clients.openWindow('/workouts/active')
    }),
  )
})

self.skipWaiting()
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})
