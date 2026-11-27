import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { HomeWidgetId, Settings, Targets } from '@/types'
import { today } from '@/lib/date'
import { useSyncStatus } from '@/lib/syncStatus'
import { useAuthStore } from '@/features/auth/authStore'
import { logWeight } from '@/features/bodyMetrics/useBodyMetrics'
import { DEFAULT_HOME_WIDGETS, homeWidgetsFrom, withCard } from '@/features/dashboard/homeWidgets'
import { updateSettings } from '@/features/settings/hooks/useSettings'
import { formulaMaintenance, goalPace, suggestedTargets, type GoalType, type Sex } from '@/features/settings/targetSuggestion'
import { bodyKg, bodyWeight, cmFrom, feetInches, unitsOf, type Units } from '@/features/settings/units'
import { spreadDays, startPlan, type StarterPlanId } from './plans'

export type TrackChoice = 'food' | 'steps' | 'water' | 'creatine' | 'magnesium'

/** What the setup asks to track, and the Home cards each brings. The rest of Home is always there. */
export const TRACK_CHOICES: { id: TrackChoice; cards: HomeWidgetId[] }[] = [
  { id: 'food', cards: ['calories', 'macros'] },
  { id: 'steps', cards: ['steps'] },
  { id: 'water', cards: ['water'] },
  { id: 'creatine', cards: ['creatine'] },
  { id: 'magnesium', cards: ['magnesium'] },
]

/** The Home cards the setup decides. */
export const TRACKABLE: HomeWidgetId[] = TRACK_CHOICES.flatMap(c => c.cards)
const cardsFor = (track: TrackChoice[]) => TRACK_CHOICES.filter(c => track.includes(c.id)).flatMap(c => c.cards)

/** Daily targets as typed on the targets screen. */
export interface TargetFields {
  kcal: string
  protein: string
  carbs: string
  fat: string
}

/** What the setup screens collect. Everything is optional; fields stay text while typed. */
export interface SetupForm {
  name: string
  /** Profile photo, as the small data URL the profile keeps. */
  avatar?: string
  sex?: Sex
  /** What height and weight are typed in; saved as the account's units. */
  units: Units
  /** Height as typed: in cm, or in feet and inches. */
  heightCm: string
  heightFt: string
  heightIn: string
  /** Weight as typed, in `units.weight`. */
  weight: string
  /** A redo: the weight already on record (kg), so an unchanged one isn't logged again. */
  weightBefore?: number
  /** YYYY-MM-DD, or empty. */
  trainingSince: string
  goal: GoalType
  workoutsPerWeek: number
  /** A plan of their own, or one made from the templates (`starter`, on `days`: 0 = Sunday). */
  plan: 'own' | 'starter'
  starter: StarterPlanId
  days: number[]
  track: TrackChoice[]
  /** Typed targets; null takes the suggestion (or, on a redo, keeps what's saved). */
  targets: TargetFields | null
  /** A theme picked on the way (it's on screen already, as a preview); unset = the default one. */
  theme?: string
}

// Food, steps and water start chosen: a new user has a working Home without deciding anything
export const EMPTY_SETUP: SetupForm = {
  name: '', units: unitsOf(undefined), heightCm: '', heightFt: '', heightIn: '', weight: '', trainingSince: '', goal: 'maintain', workoutsPerWeek: 3,
  plan: 'own', starter: 'full-body', days: spreadDays(3), track: ['food', 'steps', 'water'], targets: null,
}

/** A number typed into the form, if it's one a person could be. */
const within = (text: string, low: number, high: number): number | undefined => {
  const n = Number(text.replace(',', '.'))
  return text.trim() !== '' && Number.isFinite(n) && n >= low && n <= high ? n : undefined
}
/** The height typed, in cm. */
export function heightOf(form: SetupForm): number | undefined {
  if (form.units.height === 'cm') return within(form.heightCm, 100, 250)
  const ft = within(form.heightFt, 3, 8)
  const inches = form.heightIn.trim() ? within(form.heightIn, 0, 11.99) : 0
  return ft != null && inches != null ? cmFrom(ft, inches) : undefined
}
/** The weight typed, in its own unit. */
const typedWeight = (form: SetupForm) => (form.units.weight === 'lb' ? within(form.weight, 66, 660) : within(form.weight, 30, 300))
/** The weight typed, in kg. */
export function weightOf(form: SetupForm): number | undefined {
  const typed = typedWeight(form)
  return typed == null ? undefined : bodyKg(typed, form.units.weight)
}

/** The form with its body typed in other units: what's there is converted, not reread. */
export function withUnits(form: SetupForm, units: Units): Partial<SetupForm> {
  const height = heightOf(form)
  const weight = weightOf(form)
  const ftIn = height ? feetInches(height) : undefined
  return {
    units,
    ...(height && ftIn ? { heightCm: String(height), heightFt: String(ftIn.ft), heightIn: String(ftIn.in) } : {}),
    ...(weight ? { weight: String(bodyWeight(weight, units.weight)) } : {}),
  }
}

/** The daily targets the form's numbers come to, once sex, height and weight are all there. */
export function setupTargets(form: SetupForm) {
  const height = heightOf(form)
  const weight = weightOf(form)
  if (!form.sex || !height || !weight) return null
  // Steps are subtracted from a fresh account's calories (the default), so walking stays out of the target
  return suggestedTargets(weight, form.goal, formulaMaintenance(weight, height, form.sex, true), goalPace(form.goal, undefined, form.trainingSince, today()), height)
}

/** The targets as typed, when all four are numbers a day could be. */
export function typedTargets(form: SetupForm): Omit<Targets, 'id' | 'updatedAt'> | null {
  const t = form.targets
  if (!t) return null
  const [kcal, protein, carbs, fat] = [within(t.kcal, 800, 8000), within(t.protein, 0, 1000), within(t.carbs, 0, 1500), within(t.fat, 0, 600)]
  if (kcal == null || protein == null || carbs == null || fat == null) return null
  return { dailyKcal: Math.round(kcal), dailyProtein: Math.round(protein), dailyCarbs: Math.round(carbs), dailyFat: Math.round(fat) }
}

export const fieldsOf = (t: Omit<Targets, 'id' | 'updatedAt'>): TargetFields =>
  ({ kcal: String(t.dailyKcal), protein: String(t.dailyProtein), carbs: String(t.dailyCarbs), fat: String(t.dailyFat) })

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

/** The form filled in with what's saved, for answering the questions again (Settings). */
export async function savedSetup(): Promise<SetupForm> {
  const [settings, targets, weighIn] = await Promise.all([db.settings.get(1), db.targets.get(1), db.bodyMetrics.orderBy('date').last()])
  const cards = homeWidgetsFrom(settings)
  const units = unitsOf(settings)
  const ftIn = settings?.heightCm ? feetInches(settings.heightCm) : undefined
  const perWeek = settings?.weeklyWorkoutGoal ?? 3
  return {
    ...EMPTY_SETUP,
    name: settings?.displayName ?? '',
    avatar: settings?.avatar,
    sex: settings?.sex,
    units,
    heightCm: settings?.heightCm ? String(settings.heightCm) : '',
    heightFt: ftIn ? String(ftIn.ft) : '',
    heightIn: ftIn ? String(ftIn.in) : '',
    weight: weighIn ? String(bodyWeight(weighIn.weightKg, units.weight)) : '',
    weightBefore: weighIn?.weightKg,
    trainingSince: settings?.trainingSince ?? '',
    goal: settings?.goalType ?? 'maintain',
    workoutsPerWeek: perWeek,
    days: spreadDays(perWeek),
    track: TRACK_CHOICES.filter(c => c.cards.some(card => cards.includes(card))).map(c => c.id),
    targets: targets ? fieldsOf(targets) : null,
    theme: settings?.theme,
  }
}

/** Home's cards with the trackers set to `chosen`: the others keep their place, an added one goes where it sits by default. */
function withTrackers(current: HomeWidgetId[], chosen: HomeWidgetId[]): HomeWidgetId[] {
  return chosen.reduce(withCard, current.filter(id => !TRACKABLE.includes(id) || chosen.includes(id)))
}

/**
 * Save what was filled in (null = skipped): name, photo, body, training start, goal, theme and the
 * Home cards to settings, the weight as today's weigh-in, the targets (typed, or suggested on a
 * first run) and a starter plan if one was asked for. Writing the settings, even with nothing in
 * them, is what marks the account as set up. A redo changes only what was changed.
 */
export async function finishSetup(form: SetupForm | null, redo = false): Promise<void> {
  const settings: Partial<Omit<Settings, 'id'>> = {}
  if (form) {
    const height = heightOf(form)
    const weight = weightOf(form)
    if (form.name.trim()) settings.displayName = form.name.trim().slice(0, 40)
    if (form.avatar) settings.avatar = form.avatar
    if (form.theme) settings.theme = form.theme
    const chosen = cardsFor(form.track)
    settings.homeWidgets = withTrackers(redo ? homeWidgetsFrom(await db.settings.get(1)) : DEFAULT_HOME_WIDGETS, chosen)
    if (form.sex) settings.sex = form.sex
    settings.weightUnit = form.units.weight
    settings.heightUnit = form.units.height
    if (height) settings.heightCm = Math.round(height)
    if (form.trainingSince) settings.trainingSince = form.trainingSince
    settings.goalType = form.goal
    settings.weeklyWorkoutGoal = form.workoutsPerWeek
    // Unchanged = the number shown for the weight on record, in whichever unit it's shown in now
    const unchanged = form.weightBefore != null && typedWeight(form) === bodyWeight(form.weightBefore, form.units.weight)
    if (weight && !unchanged) await logWeight(today(), Math.round(weight * 100) / 100)
    const targets = typedTargets(form) ?? (redo ? null : setupTargets(form))
    if (targets) await db.targets.put({ id: 1, ...targets, updatedAt: Date.now(), syncPending: true })
    if (form.plan === 'starter') await startPlan(form.starter, form.days)
  }
  await updateSettings(settings)
}
