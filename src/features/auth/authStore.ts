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

interface AuthStore {
  session: Session | null
  /** Set once the signed-in user's data is ready on this device (after any account-switch wipe). */
  userId: string | null
  loading: boolean
  /** User chose "continue without an account": data stays on this device only. */
  localMode: boolean
  setSession: (session: Session | null) => void
  setUserId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setLocalMode: (on: boolean) => void
}

export const useAuthStore = create<AuthStore>(set => ({
  session: null,
  userId: null,
  loading: true,
  localMode: readLocalMode(),
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
}))
