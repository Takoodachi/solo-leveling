import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png', 'favicon.svg'],
      manifest: {
        id: '/',
        name: 'Solo Leveling',
        short_name: 'Solo Leveling',
        description: 'Workouts, nutrition and progress — level up your life',
        theme_color: '#0a0a0b',
        background_color: '#0a0a0b',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/home',
        categories: ['health', 'fitness', 'lifestyle'],
        // Long-press the icon (installed on Android or desktop; iOS has no shortcuts for web apps).
        // Fixed here: a web manifest can't differ per user. The Android app's are chosen in
        // Settings → App icon (src/features/settings/appShortcuts.ts).
        shortcuts: [
          { name: 'Start workout', url: '/workouts?start=1', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Log food', url: '/nutrition?add=1', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Log weight', url: '/analytics/weight', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
