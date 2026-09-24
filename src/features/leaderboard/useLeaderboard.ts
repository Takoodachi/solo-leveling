import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuthStore } from '@/features/auth/authStore'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { isSharing, leaderboardName } from './api'
import { buildMySnapshot } from './snapshot'
import { useLeaderboardStore } from './store'
import type { LeaderboardEntry } from './types'

/** Published rows (friends and this account's last publish); fetched on mount when stale. */
export function useLeaderboardRows() {
  const userId = useAuthStore(s => s.userId)
  const { rows, loading, error, load } = useLeaderboardStore()
  useEffect(() => {
    if (userId) void load(userId)
  }, [userId, load])
  return { signedIn: !!userId, userId, rows: userId ? rows : null, loading, error, refresh: () => (userId ? load(userId, true) : Promise.resolve()) }
}

/** Friends' rows plus this account, built live from local data so it's always current. */
export function useLeaderboard() {
  const board = useLeaderboardRows()
  const email = useAuthStore(s => s.session?.user.email)
  const { settings } = useSettings()
  const mine = useLiveQuery(() => buildMySnapshot(), [])
  const sharing = isSharing(settings)

  const me: LeaderboardEntry | null = board.userId && mine
    ? { userId: board.userId, name: leaderboardName(settings, email), snapshot: mine, updatedAt: '', me: true }
    : null
  const others = (board.rows ?? []).filter(r => r.userId !== board.userId)
  return { ...board, me, sharing, entries: me && sharing ? [me, ...others] : others, ready: board.rows != null && mine != null }
}
