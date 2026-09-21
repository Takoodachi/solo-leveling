import { useEffect } from 'react'
import { toast } from 'sonner'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { syncService, clearSyncCursors } from '@/lib/sync'
import { grantWeeklyStreakFreeze } from '@/lib/streak'
import { wipeLocalData } from '@/db/seed'
import { useAuthStore } from './authStore'

/** Which account the data on this device belongs to. */
export const LOCAL_OWNER_KEY = 'solo:localOwner'

/**
 * Make this device's data belong to `userId`: if another account's data is
 * here, wipe it first so it can't be pushed into this account.
 */
async function adoptUser(userId: string): Promise<void> {
  const owner = localStorage.getItem(LOCAL_OWNER_KEY)
  if (owner && owner !== userId) {
    await wipeLocalData()
    clearSyncCursors(owner)
  }
  localStorage.setItem(LOCAL_OWNER_KEY, userId)
  useAuthStore.getState().setLocalMode(false)
}

/**
 * Single subscription to Supabase auth. Mount once (in App).
 * Also keeps the background sync running: on sign-in, on reconnect, and when
 * the app comes back to the foreground.
 */
export function useAuthInit(): void {
  useEffect(() => {
    const store = useAuthStore.getState()

    if (!isSupabaseConfigured) {
      store.setLocalMode(true)
      store.setLoading(false)
      void grantWeeklyStreakFreeze()
      return
    }

    let currentUserId: string | null = null

    async function applySession(session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) {
      const s = useAuthStore.getState()
      s.setSession(session)
      const nextId = session?.user.id ?? null
      if (nextId === currentUserId) return
      currentUserId = nextId

      if (!nextId) {
        syncService.setUser(null)
        s.setUserId(null)
        if (s.localMode) void grantWeeklyStreakFreeze()
        return
      }
      try {
        await adoptUser(nextId)
      } catch (err) {
        console.error('[auth] preparing local data for this account failed:', err)
      }
      syncService.setUser(nextId)
      s.setUserId(nextId)
      // Sync in the background: the app is usable right away, and a slow or stalled
      // network can never hold the screen. (The first sync on a new device pulls
      // every table.) The weekly freeze waits for it so it sees the synced stats.
      void syncService.sync(nextId)
        .then(() => grantWeeklyStreakFreeze())
        .catch(err => console.error('[auth] initial sync failed:', err))
    }

    const finishLoading = () => useAuthStore.getState().setLoading(false)
    // Checking an email-link sign-in needs one network request; don't wait on it forever.
    const failsafe = setTimeout(finishLoading, 10_000)

    supabase.auth.getSession()
      .then(async ({ data }) => {
        await applySession(data.session)
        const s = useAuthStore.getState()
        if (!data.session && s.localMode) void grantWeeklyStreakFreeze()
        // The login screen shows a failed-link reason itself; elsewhere, surface it as a toast.
        if (s.linkError && (data.session || s.localMode)) {
          toast.error(s.linkError, { duration: 8000 })
          s.clearLinkError()
        }
      })
      .catch(err => console.error('[auth] session check failed:', err))
      .finally(() => {
        clearTimeout(failsafe)
        finishLoading()
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer: Supabase recommends not awaiting other auth calls inside this callback.
      setTimeout(() => void applySession(session), 0)
    })

    const resync = () => syncService.request()
    const onVisible = () => { if (document.visibilityState === 'visible') resync() }
    window.addEventListener('online', resync)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearTimeout(failsafe)
      subscription.unsubscribe()
      window.removeEventListener('online', resync)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
}
