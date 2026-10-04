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

export interface BackgroundStepsStatus {
  /** This phone's Health Connect can be read while the app is closed (Android 14+ with a current Health Connect). */
  supported: boolean
  /** "Access data in the background" is allowed for the app in Health Connect. */
  granted: boolean
  /** The periodic job is scheduled. */
  enabled: boolean
  lastRunAt: number | null
  /** What the last run did, e.g. "2 days updated, synced" or why it stopped. */
  lastResult: string | null
}

/** The app's own native plugin (android/…/SoloPlugin.kt): app shortcuts and step sync while closed. */
interface SoloPlugin {
  backgroundStepsStatus(): Promise<BackgroundStepsStatus>
  enableBackgroundSteps(): Promise<BackgroundStepsStatus>
  disableBackgroundSteps(): Promise<BackgroundStepsStatus>
  addListener(event: 'shortcut', listener: (event: { path: string }) => void): Promise<{ remove: () => Promise<void> }>
}

let solo: SoloPlugin | undefined

/** Null in a browser, on iOS, and in an Android app built before the plugin existed. */
export async function soloPlugin(): Promise<SoloPlugin | null> {
  if (!isAndroidApp()) return null
  const { Capacitor, registerPlugin } = await import('@capacitor/core')
  if (!Capacitor.isPluginAvailable('Solo')) return null
  const native = (solo ??= registerPlugin<SoloPlugin>('Solo'))
  // A Capacitor plugin is a proxy that answers every property, `then` included, so a promise
  // must never resolve to one (it would call Solo.then(), which "is not implemented"). Hand
  // out plain methods instead.
  return {
    backgroundStepsStatus: () => native.backgroundStepsStatus(),
    enableBackgroundSteps: () => native.enableBackgroundSteps(),
    disableBackgroundSteps: () => native.disableBackgroundSteps(),
    addListener: (event, listener) => native.addListener(event, listener),
  }
}

/** Runs `open` with the path of a long-press app shortcut ("Start workout"). Returns a function that stops listening. */
export function onAppShortcut(open: (path: string) => void): () => void {
  let stop = () => {}
  let stopped = false
  void soloPlugin()
    .then(plugin => plugin?.addListener('shortcut', event => open(event.path)))
    .then(handle => {
      if (!handle) return
      if (stopped) void handle.remove()
      else stop = () => void handle.remove()
    })
    .catch(() => {})
  return () => {
    stopped = true
    stop()
  }
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
