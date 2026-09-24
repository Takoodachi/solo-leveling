import { create } from 'zustand'
import { fetchLeaderboard } from './api'
import type { LeaderboardEntry } from './types'

/** Refetch when the data is older than this. */
const STALE_MS = 60_000
const cacheKey = (userId: string) => `solo:leaderboardCache:${userId}`

function readCache(userId: string): LeaderboardEntry[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : null
  } catch {
    return null
  }
}

interface LeaderboardStore {
  userId: string | null
  /** Friends' published rows (last good fetch, or the offline cache). */
  rows: LeaderboardEntry[] | null
  loading: boolean
  error: string | null
  fetchedAt: number
  load: (userId: string, force?: boolean) => Promise<void>
}

export const useLeaderboardStore = create<LeaderboardStore>((set, get) => ({
  userId: null,
  rows: null,
  loading: false,
  error: null,
  fetchedAt: 0,
  load: async (userId, force = false) => {
    const s = get()
    if (s.userId !== userId) set({ userId, rows: readCache(userId), fetchedAt: 0, error: null })
    if (get().loading || (!force && Date.now() - get().fetchedAt < STALE_MS)) return
    set({ loading: true })
    try {
      const rows = await fetchLeaderboard(userId)
      set({ rows, fetchedAt: Date.now(), error: null })
      try {
        localStorage.setItem(cacheKey(userId), JSON.stringify(rows))
      } catch {
        // cache is optional
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
    } finally {
      set({ loading: false })
    }
  },
}))
