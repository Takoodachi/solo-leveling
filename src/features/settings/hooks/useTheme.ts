import { useEffect, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { activeTheme, applyTheme, type Theme } from '../themes'

const listeners = new Set<() => void>()

/**
 * Apply a theme now and tell subscribers (useActiveTheme). `custom` is the user's own palette,
 * used when the id is the custom theme's; `remember: false` paints a preview.
 */
export function paintTheme(id: string | null | undefined, custom?: unknown, remember = true): void {
  applyTheme(id, custom, remember)
  for (const l of listeners) l()
}

/** Back to the saved theme once a preview is over (`when` is asked again after the read, in case one restarted). */
export async function repaintSavedTheme(when: () => boolean = () => true): Promise<void> {
  const settings = await db.settings.get(1)
  if (when()) paintTheme(settings?.theme, settings?.customTheme)
}

/**
 * Mount once (in App): apply the synced theme whenever it changes, whether set
 * on this device or pulled from another one.
 */
export function useThemeSync(): void {
  // As text, so an unrelated settings change doesn't repaint
  const saved = useLiveQuery(async () => {
    const settings = await db.settings.get(1)
    return JSON.stringify([settings?.theme ?? null, settings?.customTheme ?? null])
  }, [])
  useEffect(() => {
    if (saved === undefined) return // still loading: keep the cached theme
    const [id, custom] = JSON.parse(saved) as [string | null, unknown]
    paintTheme(id, custom)
  }, [saved])
}

/** The theme on screen right now (updates when it changes). */
export function useActiveTheme(): Theme {
  return useSyncExternalStore(cb => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }, activeTheme)
}
