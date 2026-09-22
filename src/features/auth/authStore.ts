import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'

const LOCAL_MODE_KEY = 'solo:localMode'

function readLocalMode(): boolean {
  try {
    return localStorage.getItem(LOCAL_MODE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * When an email sign-in link fails, Supabase redirects back with the reason in
 * the URL (#error=…&error_code=…&error_description=…). Read it once at startup,
 * before the router rewrites the URL, and remove it so a reload doesn't repeat it.
 */
function takeLinkErrorFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    const code = params.get('error_code') ?? query.get('error_code')
    const description = params.get('error_description') ?? query.get('error_description')
    if (!code && !description) return null
    window.history.replaceState(null, '', window.location.pathname)
    if (code === 'otp_expired') {
      return 'That sign-in link has expired or was already used. Each link works once, for about an hour — request a new one.'
    }
    return `That sign-in link didn’t work: ${description ?? code}.`
  } catch {
    return null
  }
}

interface AuthStore {
  session: Session | null
  /** Set once the signed-in user's data is ready on this device (after any account-switch wipe). */
  userId: string | null
  loading: boolean
  /** User chose "continue without an account": data stays on this device only. */
  localMode: boolean
  /** Why the last email sign-in link failed (shown on the login screen). */
  linkError: string | null
  setSession: (session: Session | null) => void
  setUserId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setLocalMode: (on: boolean) => void
  clearLinkError: () => void
}

export const useAuthStore = create<AuthStore>(set => ({
  session: null,
  userId: null,
  loading: true,
  localMode: readLocalMode(),
  linkError: takeLinkErrorFromUrl(),
  setSession: session => set({ session }),
  setUserId: userId => set({ userId }),
  setLoading: loading => set({ loading }),
  setLocalMode: on => {
    try {
      if (on) localStorage.setItem(LOCAL_MODE_KEY, '1')
      else localStorage.removeItem(LOCAL_MODE_KEY)
    } catch {
      // storage unavailable — keep the in-memory flag
    }
    set({ localMode: on })
  },
  clearLinkError: () => set({ linkError: null }),
}))
