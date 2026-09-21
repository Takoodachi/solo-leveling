import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Targets } from '@/types'
import { requestSync } from '@/lib/sync'

export function useTargets() {
  const targets = useLiveQuery(() => db.targets.get(1), [])

  async function updateTargets(data: Omit<Targets, 'id' | 'updatedAt' | 'syncPending'>): Promise<void> {
    await db.targets.put({
      id: 1,
      ...data,
      updatedAt: Date.now(),
      syncPending: true,
    })
    requestSync()
  }

  return { targets, updateTargets }
}
