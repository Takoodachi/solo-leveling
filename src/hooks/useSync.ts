import { useEffect } from 'react'
import { syncService } from '@/lib/sync'

export function useSync(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return

    void syncService.sync(userId)

    const handleOnline = () => void syncService.sync(userId)
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [userId])
}
