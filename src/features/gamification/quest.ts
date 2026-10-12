import { db } from '@/db'
import { requestSync } from '@/lib/sync'
import { grantXp, XP } from '@/lib/xp'
import { homeWidgetsFrom } from '@/features/dashboard/homeWidgets'
import { DEFAULT_STEP_GOAL, DEFAULT_WATER_GOAL_ML } from '@/features/settings/hooks/useSettings'

/**
 * The daily quest: a handful of things to do today, taken from what the user already tracks,
 * and bonus XP for clearing all of them. Nothing happens when it isn't cleared (no penalty, no
 * mark on the day): tomorrow simply brings a new one.
 *
 * Objectives are the user's own targets, never invented ones: move (a workout, or the step
 * goal), protein, and water / creatine when those cards are on Home. Calories aren't one:
 * a quest must never be a reason to eat less.
 */

export interface QuestObjective {
  id: 'move' | 'protein' | 'food' | 'water' | 'creatine'
  label: string
  /** Where it stands, e.g. "6,000 / 10,000 steps". */
  progress: string
  done: boolean
}

export interface Quest {
  date: string
  objectives: QuestObjective[]
  /** Every objective is done. */
  complete: boolean
  /** The bonus XP for this day has been given (on any device). */
  claimed: boolean
}

const claimId = (date: string) => `quest-${date}`
const litres = (ml: number) => `${Math.round(ml / 100) / 10}`

/** A day's quest as it stands, from that day's logs. */
export async function loadQuest(date: string): Promise<Quest> {
  const [settings, targets, workouts, activity, logs, water, creatine, claim] = await Promise.all([
    db.settings.get(1),
    db.targets.get(1),
    db.workouts.where('date').equals(date).count(),
    db.dailyActivity.where('date').equals(date).toArray(),
    db.foodLog.where('date').equals(date).toArray(),
    db.checkins.get(`water-${date}`),
    db.checkins.get(`creatine-${date}`),
    db.checkins.get(claimId(date)),
  ])
  const cards = homeWidgetsFrom(settings)
  const steps = Math.max(0, ...activity.map(a => a.steps))
  const stepGoal = settings?.dailyStepGoal ?? DEFAULT_STEP_GOAL

  const objectives: QuestObjective[] = [{
    id: 'move',
    label: `Train, or walk ${stepGoal.toLocaleString()} steps`,
    progress: workouts > 0 ? 'Workout logged' : `${steps.toLocaleString()} steps`,
    done: workouts > 0 || steps >= stepGoal,
  }]

  const proteinTarget = targets?.dailyProtein ?? 0
  if (proteinTarget > 0) {
    const foods = await db.foods.bulkGet([...new Set(logs.map(l => l.foodId))])
    const perServing = new Map(foods.flatMap(f => (f ? [[f.uuid, f.protein] as const] : [])))
    const protein = Math.round(logs.reduce((sum, l) => sum + (perServing.get(l.foodId) ?? 0) * l.servings, 0))
    objectives.push({ id: 'protein', label: 'Reach your protein target', progress: `${protein} / ${proteinTarget} g`, done: protein >= proteinTarget })
  } else {
    objectives.push({ id: 'food', label: 'Log what you eat', progress: logs.length > 0 ? 'Logged' : 'Nothing yet', done: logs.length > 0 })
  }

  if (cards.includes('water')) {
    const goal = settings?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML
    const ml = water?.amount ?? 0
    objectives.push({ id: 'water', label: 'Drink your water', progress: `${litres(ml)} / ${litres(goal)} L`, done: ml >= goal })
  }
  if (cards.includes('creatine')) {
    objectives.push({ id: 'creatine', label: 'Take your creatine', progress: creatine?.done ? 'Taken' : 'Not yet', done: !!creatine?.done })
  }

  return { date, objectives, complete: objectives.every(o => o.done), claimed: !!claim?.done }
}

/**
 * Give the day's bonus XP, once. The claim is a check-in row with a fixed id, so it syncs like
 * a creatine tick and a second device sees the quest as already paid. Returns whether it paid.
 */
export async function claimQuest(date: string): Promise<boolean> {
  const fresh = await db.transaction('rw', db.checkins, async () => {
    if ((await db.checkins.get(claimId(date)))?.done) return false
    await db.checkins.put({ uuid: claimId(date), date, key: 'quest', done: true, updatedAt: Date.now(), syncPending: true })
    return true
  })
  if (!fresh) return false
  await grantXp(XP.DAILY_QUEST)
  requestSync()
  return true
}
