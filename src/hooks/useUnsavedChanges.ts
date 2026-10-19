import { useEffect } from 'react'
import { create } from 'zustand'

/** What has unsaved changes right now: key → how to name it ("this routine"). Read by `LeaveGuard`. */
export const useUnsavedStore = create<{ open: Record<string, string> }>(() => ({ open: {} }))

/**
 * Marks `what` as having unsaved changes while `dirty`: leaving the screen then asks first
 * (components/LeaveGuard). A save that navigates away calls `forgetUnsaved` first, since the
 * component hasn't re-rendered clean by then.
 */
export function useUnsavedChanges(key: string, dirty: boolean, what: string): void {
  useEffect(() => {
    if (!dirty) return
    useUnsavedStore.setState(s => ({ open: { ...s.open, [key]: what } }))
    return () => forgetUnsaved(key)
  }, [key, dirty, what])
}

export function forgetUnsaved(key: string): void {
  useUnsavedStore.setState(s => ({ open: Object.fromEntries(Object.entries(s.open).filter(([k]) => k !== key)) }))
}
