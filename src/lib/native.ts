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

/** A reminder the app posts itself, with a button that logs without opening it (QuickLog.kt). */
export interface QuickLogReminder {
  id: number
  kind: 'creatine' | 'water'
  /** The day it's for (YYYY-MM-DD): the button logs to that day. */
  date: string
  at: number
  title: string
  body: string
  /** Opened when the notification itself is tapped. */
  url: string
  /** The button: "Tick it off", "Add a glass". */
  action: string
}

/** The app's own native plugin (android/…/SoloPlugin.kt): app shortcuts, step sync while closed, sharing, quick-log reminders. */
interface SoloPlugin {
  backgroundStepsStatus(): Promise<BackgroundStepsStatus>
  enableBackgroundSteps(): Promise<BackgroundStepsStatus>
  disableBackgroundSteps(): Promise<BackgroundStepsStatus>
  /** Android's share sheet for a PNG (the WebView has no Web Share API). Since the recap share card. */
  shareImage(options: { base64: string; fileName: string; text?: string }): Promise<void>
  /** Replaces every quick-log reminder with `items`. Since notification buttons. */
  scheduleQuickLog(options: { items: QuickLogReminder[] }): Promise<void>
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
    shareImage: options => native.shareImage(options),
    scheduleQuickLog: options => native.scheduleQuickLog(options),
    addListener: (event, listener) => native.addListener(event, listener),
  }
}

/** An APK built before a plugin method existed answers it with UNIMPLEMENTED. */
export function isUnimplemented(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code
  return code === 'UNIMPLEMENTED' || /not implemented/i.test(err instanceof Error ? err.message : String(err))
}

/**
 * Hands creatine and water reminders to the app's own notifications, which carry a log button
 * (QuickLog.kt). False when the APK predates them: then they go out as plain notifications.
 */
export async function scheduleQuickLogReminders(items: QuickLogReminder[]): Promise<boolean> {
  const plugin = await soloPlugin()
  if (!plugin) return false
  try {
    await plugin.scheduleQuickLog({ items })
    return true
  } catch (err) {
    if (isUnimplemented(err)) return false
    throw err
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
