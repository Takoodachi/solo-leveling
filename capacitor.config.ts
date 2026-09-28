import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The Android app (the owner's phone): a Capacitor shell around the live site, so every web
 * deploy reaches it with no reinstall, the same moment it reaches the iOS home-screen app.
 * Only native changes (plugins, permissions, icons) need a new APK. It adds Samsung Health
 * steps through Health Connect (features/health).
 *
 * CAP_SERVER_URL points a build at a dev server instead, e.g. http://192.168.1.20:5173
 * (or http://10.0.2.2:5173 from the emulator).
 */
const devUrl = process.env.CAP_SERVER_URL

const config: CapacitorConfig = {
  appId: 'io.github.takoodachi.sololeveling',
  appName: 'Solo Leveling',
  // Bundled into the APK but not loaded while server.url is set
  webDir: 'dist',
  server: {
    url: devUrl ?? 'https://solo-leveling.luongdtran06.workers.dev',
    cleartext: devUrl?.startsWith('http://') ?? false,
  },
  android: {
    backgroundColor: '#0a0a0b',
  },
  plugins: {
    // The site already uses viewport-fit=cover; this avoids a layout jump before it loads
    SystemBars: { initialViewportFitValueHint: 'cover', style: 'DARK' },
  },
}

export default config
