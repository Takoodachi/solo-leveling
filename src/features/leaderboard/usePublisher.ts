import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth/authStore'
import { useSyncStatus } from '@/lib/syncStatus'

/**
 * Mount once (in App): republish this account's leaderboard row shortly after
 * each successful sync, so friends see changes from any device. The publisher
 * loads on demand to keep the rank maths out of the startup bundle.
 */
export function useLeaderboardPublisher(): void {
  const userId = useAuthStore(s => s.userId)
  const email = useAuthStore(s => s.session?.user.email)
  const lastSyncedAt = useSyncStatus(s => s.lastSyncedAt)
  useEffect(() => {
    if (!userId || !lastSyncedAt) return
    const timer = setTimeout(() => {
      import('./api')
        .then(m => m.publishLeaderboard(userId, email))
        .catch(err => console.warn('[leaderboard] publish failed:', err))
    }, 2000)
    return () => clearTimeout(timer)
  }, [userId, email, lastSyncedAt])
}
