import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Targets } from '@/types'
import { syncService } from '@/lib/sync'
import { useAuthStore } from '@/features/auth/authStore'

export function useTargets() {
  const targets = useLiveQuery(() => db.targets.get(1), [])

  async function updateTargets(data: Omit<Targets, 'id' | 'updatedAt' | 'syncPending'>): Promise<void> {
    await db.targets.put({
      id: 1,
      ...data,
      updatedAt: Date.now(),
      syncPending: true,
    })
    const userId = useAuthStore.getState().userId
    if (userId) void syncService.sync(userId)
  }

  return { targets, updateTargets }
}
