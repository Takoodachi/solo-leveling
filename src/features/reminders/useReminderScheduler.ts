import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { exercisesById, setsOfWorkouts } from '@/db/read'
import { useNow } from '@/hooks/useNow'
import { addDays, parseISO } from 'date-fns'
import { toDateStr } from '@/lib/date'
import { useAuthStore } from '@/features/auth/authStore'
import { useWorkoutStore } from '@/features/workouts/store'
import { DEFAULT_WATER_GOAL_ML } from '@/features/settings/hooks/useSettings'
import { PLAN_DAYS, planReminders, reminderPrefs, type ReminderFacts, type ReminderPrefs } from './reminders'
import { deliverPlan } from './deliver'
import { refreshPushSubscription } from './push'
import { REMINDERS_CHANGED } from './useDeviceNotifications'

/** The settings and today's state that decide which nudges are still due. */
async function loadInputs(today: string, working: boolean): Promise<{ prefs: ReminderPrefs; facts: ReminderFacts }> {
  const [settings, creatine, water, workouts, food, weighIns, routines, ahead] = await Promise.all([
    db.settings.get(1),
    db.checkins.get(`creatine-${today}`),
    db.checkins.get(`water-${today}`),
    db.workouts.where('date').equals(today).toArray(),
    db.foodLog.where('date').equals(today).count(),
    db.bodyMetrics.where('date').equals(today).count(),
    db.routines.toArray(),
    db.checkins.where('date').between(today, toDateStr(addDays(parseISO(today), PLAN_DAYS - 1)), true, true).toArray(),
  ])
  const daysOf = (key: 'skip' | 'pause') => ahead.filter(c => c.key === key && c.done).map(c => c.date)
  // Stretched today: a stretch in any of today's workouts, a cool-down at the end of one included
  const [sets, exerciseOf] = await Promise.all([setsOfWorkouts(workouts.map(w => w.uuid)), exercisesById()])
  const stretched = sets.some(s => exerciseOf.get(s.exerciseId)?.type === 'flexibility')
  const stretching = routines.filter(r => r.category === 'stretching').sort((a, b) => b.scheduleDays.length - a.scheduleDays.length)[0]
  return {
    prefs: reminderPrefs(settings),
    facts: {
      done: {
        // A workout in progress counts: no "time to train" halfway through one
        workout: workouts.length > 0 || working,
        stretch: stretched || working,
        creatine: !!creatine?.done,
        food: food > 0,
        weight: weighIns > 0,
        water: (water?.amount ?? 0) >= (settings?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML),
      },
      routines: Object.fromEntries(routines.flatMap(r => r.scheduleDays.map(d => [d, r.name]))),
      skipped: daysOf('skip'),
      paused: daysOf('pause'),
      stretchRoutine: stretching && { id: stretching.uuid, name: stretching.name },
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
  // From the store, not its saved copy: that row is rewritten on every keystroke of a workout,
  // and reading it here ran all of this again each time
  const working = useWorkoutStore(s => !!s.draft)
  const inputs = useLiveQuery(() => loadInputs(today, working), [today, working])
  const [wake, setWake] = useState(0)
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
