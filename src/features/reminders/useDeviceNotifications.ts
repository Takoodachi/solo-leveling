import { useCallback, useEffect, useState } from 'react'
import { isAndroidApp } from '@/lib/native'
import { nativeNotifyState, requestNativeNotify } from '@/lib/localNotifications'
import { useAuthStore } from '@/features/auth/authStore'
import { NATIVE_ON_KEY, resetDelivery } from './deliver'
import { isPushConfigured, pushSubscription, pushSupport, subscribePush, unsubscribePush } from './push'

/** Whether this device shows reminders, and what's in the way when it can't. */
export type DeviceNotify =
  | 'checking' | 'on' | 'off'
  | 'blocked' // the phone or browser refuses notifications from the app
  | 'needs-install' // iPhone in Safari: push exists only for the home-screen app
  | 'needs-signin' // push goes through the account
  | 'needs-update' // an Android app from before notifications were added
  | 'not-set-up' // the build has no push key
  | 'unsupported'

/** Tells the scheduler to deliver the plan again (useReminderScheduler listens). */
export const REMINDERS_CHANGED = 'solo:reminders-changed'

async function read(userId: string | null): Promise<DeviceNotify> {
  if (isAndroidApp()) {
    const state = await nativeNotifyState()
    if (state === 'missing') return 'needs-update'
    if (state === 'denied') return 'blocked'
    return state === 'granted' && localStorage.getItem(NATIVE_ON_KEY) === '1' ? 'on' : 'off'
  }
  const support = pushSupport()
  if (support !== 'ok') return support === 'needs-install' ? 'needs-install' : 'unsupported'
  if (!isPushConfigured) return 'not-set-up'
  if (!userId) return 'needs-signin'
  if (Notification.permission === 'denied') return 'blocked'
  return (await pushSubscription()) ? 'on' : 'off'
}

export function useDeviceNotifications() {
  const userId = useAuthStore(s => s.userId)
  const [state, setState] = useState<DeviceNotify>('checking')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => read(userId).then(setState, () => setState('unsupported')), [userId])

  useEffect(() => {
    void refresh()
    // Permission can be changed in the system settings while the app is in the background
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  /** Must be called from the tap: browsers only show the permission prompt in response to one. */
  const set = useCallback(async (on: boolean): Promise<DeviceNotify> => {
    setBusy(true)
    try {
      let next: DeviceNotify
      if (isAndroidApp()) {
        if (on && !(await requestNativeNotify())) next = 'blocked'
        else {
          if (on) localStorage.setItem(NATIVE_ON_KEY, '1')
          else localStorage.removeItem(NATIVE_ON_KEY)
          next = on ? 'on' : 'off'
        }
      } else if (on) {
        const result = await subscribePush()
        next = result === 'failed' ? 'off' : result
      } else {
        await unsubscribePush()
        next = 'off'
      }
      setState(next)
      resetDelivery()
      window.dispatchEvent(new Event(REMINDERS_CHANGED))
      return next
    } finally {
      setBusy(false)
    }
  }, [])

  return { state, busy, set }
}
