import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Settings } from '@/types'
import { today } from '@/lib/date'
import { useSyncStatus } from '@/lib/syncStatus'
import { useAuthStore } from '@/features/auth/authStore'
import { logWeight } from '@/features/bodyMetrics/useBodyMetrics'
import { updateSettings } from '@/features/settings/hooks/useSettings'
import { formulaMaintenance, suggestedTargets, type GoalType, type Sex } from '@/features/settings/targetSuggestion'

/** What the first-run screens collect. Everything is optional; fields stay text while typed. */
export interface SetupForm {
  name: string
  sex?: Sex
  heightCm: string
  weightKg: string
  /** YYYY-MM-DD, or empty. */
  trainingSince: string
  goal: GoalType
  workoutsPerWeek: number
}

export const EMPTY_SETUP: SetupForm = { name: '', heightCm: '', weightKg: '', trainingSince: '', goal: 'maintain', workoutsPerWeek: 3 }

/** A number typed into the form, if it's one a person could be. */
const within = (text: string, low: number, high: number): number | undefined => {
  const n = Number(text.replace(',', '.'))
  return text.trim() !== '' && Number.isFinite(n) && n >= low && n <= high ? n : undefined
}
export const heightOf = (form: SetupForm) => within(form.heightCm, 100, 250)
export const weightOf = (form: SetupForm) => within(form.weightKg, 30, 300)

/** The daily targets the form's numbers come to, once sex, height and weight are all there. */
export function setupTargets(form: SetupForm) {
  const height = heightOf(form)
  const weight = weightOf(form)
  if (!form.sex || !height || !weight) return null
  // Steps are subtracted from a fresh account's calories (the default), so walking stays out of the target
  return suggestedTargets(weight, form.goal, formulaMaintenance(weight, height, form.sex, true))
}

/**
 * The account has never been set up: its settings are still the row every fresh device starts
 * with (`updatedAt` 0). Saving anything in Settings ends that, on every device once synced, so
 * no flag of its own is needed. Signed in, it waits for the first sync: until then a new
 * device can't tell a new account from an old one whose settings haven't arrived.
 */
export function useNeedsSetup(ready: boolean): boolean {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const localMode = useAuthStore(s => s.localMode)
  const synced = useSyncStatus(s => s.lastSyncedAt != null)
  return ready && !!settings && (settings.updatedAt ?? 0) === 0 && (localMode || synced)
}

/**
 * Save what was filled in (null = skipped): name, body, training start and goal to settings, the weight as
 * today's weigh-in, and suggested targets when there's enough to work them out. Writing the
 * settings, even with nothing in them, is what marks the account as set up.
 */
export async function finishSetup(form: SetupForm | null): Promise<void> {
  const settings: Partial<Omit<Settings, 'id'>> = {}
  if (form) {
    const height = heightOf(form)
    const weight = weightOf(form)
    if (form.name.trim()) settings.displayName = form.name.trim().slice(0, 40)
    if (form.sex) settings.sex = form.sex
    if (height) settings.heightCm = Math.round(height)
    if (form.trainingSince) settings.trainingSince = form.trainingSince
    settings.goalType = form.goal
    settings.weeklyWorkoutGoal = form.workoutsPerWeek
    if (weight) await logWeight(today(), Math.round(weight * 10) / 10)
    const targets = setupTargets(form)
    if (targets) await db.targets.put({ id: 1, ...targets, updatedAt: Date.now(), syncPending: true })
  }
  await updateSettings(settings)
}
