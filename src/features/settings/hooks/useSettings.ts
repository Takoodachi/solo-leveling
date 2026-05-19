import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Settings } from '@/types'

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.get(1), [])

  async function updateSettings(data: Partial<Omit<Settings, 'id'>>): Promise<void> {
    const current = await db.settings.get(1)
    if (!current) return
    await db.settings.put({ ...current, ...data })
  }

  return { settings, updateSettings }
}
