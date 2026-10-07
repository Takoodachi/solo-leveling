import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { AppShortcutId } from '@/types'
import { isAndroidApp, setIconShortcuts } from '@/lib/native'
import { APP_SHORTCUTS, appShortcutsFrom } from '../appShortcuts'

/**
 * Mount once (in App). Android app: keeps the long-press shortcuts on its icon in step with
 * Settings → App icon, on launch and whenever the choice changes (here or on another device).
 */
export function useAppShortcuts(ready: boolean): void {
  // As text, so only a change to the choice itself re-runs this
  const chosen = useLiveQuery(async () => appShortcutsFrom(await db.settings.get(1)).join(','), [])
  useEffect(() => {
    if (!ready || chosen === undefined || !isAndroidApp()) return
    const ids = (chosen ? chosen.split(',') : []) as AppShortcutId[]
    const items = ids.map(id => ({ id, label: APP_SHORTCUTS[id].label, path: APP_SHORTCUTS[id].path, icon: id }))
    void setIconShortcuts(items).catch((err: unknown) => console.warn('[shortcuts] couldn’t update the app icon:', err))
  }, [ready, chosen])
}
