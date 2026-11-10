import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { useSyncStatus } from '@/lib/syncStatus'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { extraOn } from '@/features/settings/extras'

const EVERY_MS = 10 * 60_000
let lastCheck = 0

/**
 * Mount once (in App): a little after a sync, at most every 10 minutes, see whether friends
 * high-fived your highlights, and say so in one toast a day at most. Loaded on demand, like
 * the publisher, to keep the rank maths out of the startup bundle.
 */
export function useHighFiveDigest(): void {
  const userId = useAuthStore(s => s.userId)
  const online = useAuthStore(s => !!s.session)
  const lastSyncedAt = useSyncStatus(s => s.lastSyncedAt)
  const navigate = useNavigate()
  const { settings } = useSettings()
  const on = !!settings && extraOn('highFives', settings.extras)
  useEffect(() => {
    if (!on || !userId || !online || !lastSyncedAt) return
    const timer = setTimeout(() => {
      if (Date.now() - lastCheck < EVERY_MS) return
      lastCheck = Date.now()
      import('./highFiveDigest')
        .then(m => m.announceHighFives(userId, () => navigate('/leaderboard#highlights')))
        .catch(err => console.warn('[high-fives] check failed:', err))
    }, 4000)
    return () => clearTimeout(timer)
  }, [on, userId, online, lastSyncedAt, navigate])
}
