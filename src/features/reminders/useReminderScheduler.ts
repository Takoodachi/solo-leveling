import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useNow } from '@/hooks/useNow'
import { toDateStr } from '@/lib/date'
import { useAuthStore } from '@/features/auth/authStore'
import { DEFAULT_WATER_GOAL_ML } from '@/features/settings/hooks/useSettings'
import { planReminders, reminderPrefs, type ReminderFacts, type ReminderPrefs } from './reminders'
import { deliverPlan } from './deliver'
import { refreshPushSubscription } from './push'
import { REMINDERS_CHANGED } from './useDeviceNotifications'

/** The settings and today's state that decide which nudges are still due. */
async function loadInputs(today: string): Promise<{ prefs: ReminderPrefs; facts: ReminderFacts }> {
  const [settings, creatine, water, workouts, food, weighIns, routines, draft] = await Promise.all([
    db.settings.get(1),
    db.checkins.get(`creatine-${today}`),
    db.checkins.get(`water-${today}`),
    db.workouts.where('date').equals(today).count(),
    db.foodLog.where('date').equals(today).count(),
    db.bodyMetrics.where('date').equals(today).count(),
    db.routines.toArray(),
    db.workoutDrafts.get(1),
  ])
  return {
    prefs: reminderPrefs(settings),
    facts: {
      done: {
        // A workout in progress counts: no "time to train" halfway through one
        workout: workouts > 0 || !!draft,
        creatine: !!creatine?.done,
        food: food > 0,
        weight: weighIns > 0,
        water: (water?.amount ?? 0) >= (settings?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML),
      },
      routines: Object.fromEntries(routines.flatMap(r => r.scheduleDays.map(d => [d, r.name]))),
    },
  }
}

/**
 * Mount once (in App). Keeps the coming reminders in step with the settings and with what's
 * been logged today: re-planned when either changes, when the app comes back to the front, on
 * reconnect, and at midnight. `ready` waits for the session check.
 */
export function useReminderScheduler(ready: boolean): void {
  const today = toDateStr(useNow())
  const userId = useAuthStore(s => s.userId)
  const inputs = useLiveQuery(() => loadInputs(today), [today])
  const [wake, setWake] = useState(0)
  // The draft row is rewritten on every keystroke of a workout; only a change in the answer matters
  const signature = inputs ? JSON.stringify(inputs) : null

  useEffect(() => {
    const bump = () => { if (document.visibilityState === 'visible') setWake(n => n + 1) }
    document.addEventListener('visibilitychange', bump)
    window.addEventListener('online', bump)
    window.addEventListener(REMINDERS_CHANGED, bump)
    return () => {
      document.removeEventListener('visibilitychange', bump)
      window.removeEventListener('online', bump)
      window.removeEventListener(REMINDERS_CHANGED, bump)
    }
  }, [])

  useEffect(() => {
    if (!ready || !signature) return
    const { prefs, facts } = JSON.parse(signature) as { prefs: ReminderPrefs; facts: ReminderFacts }
    // A short pause, so a burst of taps (ticking creatine, adding three foods) plans once
    const timer = setTimeout(() => {
      void deliverPlan(planReminders(prefs, facts, new Date()), userId)
      void refreshPushSubscription().catch(() => {})
    }, 1500)
    return () => clearTimeout(timer)
  }, [ready, signature, userId, wake])
}
