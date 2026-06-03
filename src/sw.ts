/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
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

self.skipWaiting()
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})
