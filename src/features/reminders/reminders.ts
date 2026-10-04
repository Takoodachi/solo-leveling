import { addDays, startOfDay } from 'date-fns'
import type { ReminderKind, ReminderPref, Settings } from '@/types'
import { toDateStr } from '@/lib/date'

/**
 * What the app can remind you about, and the plan of nudges for the coming days. The plan is
 * worked out on the device and handed to whatever delivers it: local notifications in the
 * Android app, the server's push queue for home-screen apps and browsers (`deliver.ts`).
 * Today's nudge is left out once the thing is done, and the plan is redone whenever that
 * changes, so nobody is reminded of what they've already logged.
 */

export interface ReminderDef {
  kind: ReminderKind
  label: string
  description: string
  /** Default time, HH:mm. */
  time: string
  title: string
  body: string
  /** Where tapping the notification lands. */
  url: string
}

export const REMINDERS: ReminderDef[] = [
  { kind: 'workout', label: 'Workout', description: 'When it’s time to train', time: '17:30', title: 'Time to train', body: 'Tap to start your workout.', url: '/workouts?start=1' },
  { kind: 'creatine', label: 'Creatine', description: 'Until you’ve ticked it off', time: '09:00', title: 'Creatine', body: 'Take it and tick it off.', url: '/home' },
  { kind: 'food', label: 'Log your food', description: 'If nothing is logged by then', time: '20:00', title: 'Log today’s food', body: 'Nothing logged yet today.', url: '/nutrition?add=1' },
  { kind: 'weight', label: 'Weigh-in', description: 'If you haven’t weighed in that day', time: '07:30', title: 'Weigh-in', body: 'Step on the scale and log it.', url: '/analytics/weight' },
  { kind: 'water', label: 'Water', description: 'If you’re short of your goal', time: '15:00', title: 'Water check', body: 'Have a glass and log it.', url: '/home' },
  { kind: 'recap', label: 'Weekly recap', description: 'Every Monday', time: '09:00', title: 'Your weekly recap is ready', body: 'See how last week went.', url: '/recap' },
]

export type ReminderPrefs = Record<ReminderKind, ReminderPref>

/** Every reminder's setting: off at its default time until chosen. Carries over the old workout-only reminder. */
export function reminderPrefs(settings: Settings | undefined): ReminderPrefs {
  const saved = settings?.reminders ?? {}
  const prefs = Object.fromEntries(REMINDERS.map(d => [d.kind, saved[d.kind] ?? { on: false, time: d.time }])) as ReminderPrefs
  if (!saved.workout && settings?.reminderEnabled != null) {
    prefs.workout = { on: settings.reminderEnabled, time: settings.reminderTime ?? prefs.workout.time }
  }
  prefs.workout = { ...prefs.workout, days: saved.workout?.days ?? settings?.reminderDays ?? 'workout-days' }
  return prefs
}

export interface ReminderFacts {
  /** Already done today, so today's nudge is dropped. */
  done: Partial<Record<ReminderKind, boolean>>
  /** Weekday (0 = Sunday) → the routine scheduled that day. */
  routines: Record<number, string>
}

export interface PlannedReminder {
  /** `kind-YYYY-MM-DD`: one per reminder per day. */
  key: string
  kind: ReminderKind
  at: number
  title: string
  body: string
  url: string
}

export const PLAN_DAYS = 14

/** The nudges still to come over the next `days` days, soonest first. */
export function planReminders(prefs: ReminderPrefs, facts: ReminderFacts, now: Date, days = PLAN_DAYS): PlannedReminder[] {
  const plan: PlannedReminder[] = []
  for (let i = 0; i < days; i++) {
    const day = addDays(startOfDay(now), i)
    const routine = facts.routines[day.getDay()]
    for (const def of REMINDERS) {
      const pref = prefs[def.kind]
      const [hours, minutes] = pref.time.split(':').map(Number)
      if (!pref.on || !Number.isInteger(hours) || !Number.isInteger(minutes)) continue
      if (i === 0 && facts.done[def.kind]) continue
      if (def.kind === 'recap' && day.getDay() !== 1) continue
      if (def.kind === 'workout' && pref.days !== 'daily' && !routine) continue
      const at = new Date(day)
      at.setHours(hours, minutes, 0, 0)
      if (at.getTime() <= now.getTime()) continue
      plan.push({
        key: `${def.kind}-${toDateStr(day)}`,
        kind: def.kind,
        at: at.getTime(),
        title: def.kind === 'workout' && routine ? `${routine} today` : def.title,
        body: def.body,
        url: def.url,
      })
    }
  }
  return plan.sort((a, b) => a.at - b.at)
}
