import { useEffect, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { applyTheme, themeById, type Theme } from '../themes'

const listeners = new Set<() => void>()
const current = () => document.documentElement.dataset.theme ?? ''

/** Apply a theme now and tell subscribers (useActiveTheme). */
export function paintTheme(id: string | null | undefined): void {
  applyTheme(id)
  for (const l of listeners) l()
}

/**
 * Mount once (in App): apply the synced theme whenever it changes, whether set
 * on this device or pulled from another one.
 */
export function useThemeSync(): void {
  const theme = useLiveQuery(async () => (await db.settings.get(1))?.theme ?? null, [])
  useEffect(() => {
    if (theme === undefined) return // still loading: keep the cached theme
    paintTheme(theme)
  }, [theme])
}

/** The theme on screen right now (updates when it changes). */
export function useActiveTheme(): Theme {
  const id = useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    current,
  )
  return themeById(id)
}
