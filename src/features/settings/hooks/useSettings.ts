import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Settings } from '@/types'
import { requestSync } from '@/lib/sync'

export const DEFAULT_STEP_GOAL = 10000
export const DEFAULT_REST_SECONDS = 90

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

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  return { settings, updateSettings }
}
