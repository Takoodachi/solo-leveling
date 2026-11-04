import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests run in Node against the app's own modules (the same @ alias as vite.config.ts, none of
// its plugins); Dexie gets a stand-in IndexedDB (src/test/setup.ts). Run: npm test
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'], setupFiles: ['src/test/setup.ts'], environment: 'node' },
})
