import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Settings } from '@/types'
import { requestSync } from '@/lib/sync'

export const DEFAULT_STEP_GOAL = 10000
export const DEFAULT_REST_SECONDS = 90
export const DEFAULT_WATER_GOAL_ML = 2500
export const DEFAULT_WATER_GLASS_ML = 250

export async function updateSettings(data: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const current = (await db.settings.get(1)) ?? { id: 1 as const }
  await db.settings.put({
    ...current,
    ...data,
    updatedAt: Date.now(),
    syncPending: true,
  })
  requestSync()
}

/**
 * A change worked out from what's saved right now, read and written in one transaction, so two
 * quick taps on a list (add this, remove that) can't undo each other. Null leaves it alone.
 */
export async function changeSettings(change: (current: Settings | undefined) => Partial<Omit<Settings, 'id'>> | null): Promise<void> {
  const changed = await db.transaction('rw', db.settings, async () => {
    const current = await db.settings.get(1)
    const data = change(current)
    if (!data) return false
    await db.settings.put({ ...(current ?? { id: 1 as const }), ...data, updatedAt: Date.now(), syncPending: true })
    return true
  })
  if (changed) requestSync()
}

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  return { settings, updateSettings }
}
