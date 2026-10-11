import { useEffect } from 'react'

/**
 * Runs `refresh` now, and again each time the app comes back to the front: what it reads
 * (a permission, the result of a background job) can change while the app is away.
 * `refresh` has to be stable (useCallback), or it runs on every render.
 */
export function useRefreshOnReturn(refresh: () => unknown): void {
  useEffect(() => {
    void refresh()
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])
}
