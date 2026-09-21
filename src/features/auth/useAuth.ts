import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { syncService, clearSyncCursors } from '@/lib/sync'
import { wipeLocalData } from '@/db/seed'
import { grantWeeklyStreakFreeze } from '@/lib/streak'
import { useAuthStore } from './authStore'
import { LOCAL_OWNER_KEY } from './useAuthInit'

type Result = { error: string | null }

/** Turn Supabase auth errors into something actionable. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'Wrong email or password.'
  if (m.includes('email not confirmed')) {
    return 'This account isn’t confirmed yet. In Supabase → Authentication → Users, confirm it (or recreate it with “Auto Confirm User”).'
  }
  if (m.includes('signups not allowed') || m.includes('user not found')) {
    return 'There’s no account for that email. Accounts are created by the app owner in Supabase.'
  }
  if (m.includes('rate limit') || m.includes('security purposes')) {
    return 'Too many sign-in emails requested. Supabase’s free email service only sends a few per hour — wait a bit, or sign in with your password.'
  }
  if (m.includes('failed to fetch') || m.includes('network')) return 'Can’t reach the server — check your connection.'
  return message
}

async function signInWithPassword(email: string, password: string): Promise<Result> {
  if (!isSupabaseConfigured) return { error: 'Sync is not configured for this build.' }
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  return { error: error ? friendlyAuthError(error.message) : null }
}

/** Email link sign-in. Only reliable for addresses Supabase's built-in mailer will send to (org members). */
async function sendSignInLink(email: string): Promise<Result> {
  if (!isSupabaseConfigured) return { error: 'Sync is not configured for this build.' }
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    // Must be listed under Supabase → Authentication → URL Configuration → Redirect URLs,
    // otherwise Supabase sends the user to the Site URL instead.
    options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
  })
  return { error: error ? friendlyAuthError(error.message) : null }
}

async function setPassword(password: string): Promise<Result> {
  const { error } = await supabase.auth.updateUser({ password })
  return { error: error?.message ?? null }
}

/**
 * Sign out and wipe this device's copy of the account's data. Pushes pending
 * changes first when online; callers should warn if `syncService.pendingCount()` > 0.
 */
async function signOut(): Promise<void> {
  const userId = useAuthStore.getState().userId
  if (userId) await syncService.sync(userId)
  await syncService.whenIdle()
  syncService.setUser(null)
  await supabase.auth.signOut({ scope: 'local' })
  await wipeLocalData()
  if (userId) clearSyncCursors(userId)
  localStorage.removeItem(LOCAL_OWNER_KEY)
}

function continueWithoutAccount(): void {
  useAuthStore.getState().setLocalMode(true)
  void grantWeeklyStreakFreeze()
}

export function useAuth() {
  const session = useAuthStore(s => s.session)
  const loading = useAuthStore(s => s.loading)
  const localMode = useAuthStore(s => s.localMode)

  return {
    session,
    loading,
    localMode,
    isConfigured: isSupabaseConfigured,
    signInWithPassword,
    sendSignInLink,
    setPassword,
    signOut,
    continueWithoutAccount,
  }
}
