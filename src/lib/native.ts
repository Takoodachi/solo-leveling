/**
 * The Android app is a Capacitor shell that loads the live site (capacitor.config.ts), so it
 * runs this same bundle. Capacitor injects `window.Capacitor` into it; browsers and the iOS
 * home-screen app never have one. Native-only code checks here first and imports its plugins
 * lazily, so none of it runs (or even loads) anywhere else.
 */
interface CapacitorBridge {
  getPlatform?: () => string
}

export function isAndroidApp(): boolean {
  return (globalThis as { Capacitor?: CapacitorBridge }).Capacitor?.getPlatform?.() === 'android'
}

/** The Android status and navigation bars are see-through: light icons on dark themes, dark on light ones. */
export function setSystemBarStyle(mode: 'dark' | 'light'): void {
  if (!isAndroidApp()) return
  void import('@capacitor/core')
    .then(({ SystemBars, SystemBarsStyle }) =>
      SystemBars.setStyle({ style: mode === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }),
    )
    .catch(() => {}) // cosmetic only
}
