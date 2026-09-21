import { create } from 'zustand'

export type SyncState = 'idle' | 'syncing' | 'error'

interface SyncStatusStore {
  state: SyncState
  lastSyncedAt: number | null
  error: string | null
  set: (patch: Partial<Omit<SyncStatusStore, 'set'>>) => void
}

/** UI-facing status of the background sync (shown in Profile → Account). */
export const useSyncStatus = create<SyncStatusStore>(set => ({
  state: 'idle',
  lastSyncedAt: null,
  error: null,
  set: patch => set(patch),
}))
