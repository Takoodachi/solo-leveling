/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null }>
}

// 1. Precache app shell (Vite injects __WB_MANIFEST at build time).
precacheAndRoute(self.__WB_MANIFEST ?? [])
cleanupOutdatedCaches()

// 2. Runtime caches (mirrors the previous generateSW config).
registerRoute(
  ({ url }) => url.origin === 'https://world.openfoodfacts.org',
  new NetworkFirst({
    cacheName: 'open-food-facts',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 })],
  }),
)
registerRoute(
  ({ url }) => url.origin === 'https://wger.de' && url.pathname.startsWith('/en/exercise/'),
  new CacheFirst({
    cacheName: 'muscle-diagrams',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)

// 3. Rest-alarm scheduling. Pages postMessage({ type: 'schedule-rest-alarm', endAt }).
// We hold the timeout in the SW so the alarm still fires if the page is suspended
// (best-effort — the OS may still kill the SW; the page-side timer is a backup).
let restAlarmTimer: ReturnType<typeof setTimeout> | null = null

function clearRestAlarm() {
  if (restAlarmTimer) {
    clearTimeout(restAlarmTimer)
    restAlarmTimer = null
  }
}

function scheduleRestAlarm(endAt: number) {
  clearRestAlarm()
  const ms = endAt - Date.now()
  if (ms <= 0) {
    void fireRestNotification()
    return
  }
  restAlarmTimer = setTimeout(() => {
    void fireRestNotification()
    restAlarmTimer = null
  }, ms)
}

async function fireRestNotification() {
  try {
    await self.registration.showNotification('Rest done!', {
      body: 'Time to hit the next set 💪',
      icon: '/icons/icon-192.png',
      tag: 'rest-timer',
      requireInteraction: false,
    })
  } catch {
    // ignore
  }
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string; endAt?: number } | undefined
  if (!data) return
  if (data.type === 'schedule-rest-alarm' && typeof data.endAt === 'number') {
    scheduleRestAlarm(data.endAt)
  } else if (data.type === 'cancel-rest-alarm') {
    clearRestAlarm()
  }
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow('/')
    }),
  )
})

self.skipWaiting()
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})
