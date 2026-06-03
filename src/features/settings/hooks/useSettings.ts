import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Settings } from '@/types'
import { syncService } from '@/lib/sync'
import { useAuthStore } from '@/features/auth/authStore'

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.get(1), [])

  async function updateSettings(data: Partial<Omit<Settings, 'id'>>): Promise<void> {
    const current = await db.settings.get(1)
    if (!current) return
    await db.settings.put({
      ...current,
      ...data,
      updatedAt: Date.now(),
      syncPending: true,
    })
    const userId = useAuthStore.getState().userId
    if (userId) void syncService.sync(userId)
  }

  return { settings, updateSettings }
}
