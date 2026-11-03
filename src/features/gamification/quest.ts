import { parseISO, subDays } from 'date-fns'
import { db } from '@/db'
import { toDateStr } from '@/lib/date'
import { requestSync } from '@/lib/sync'
import { grantXp, XP } from '@/lib/xp'
import type { MealType } from '@/types'
import { homeWidgetsFrom } from '@/features/dashboard/homeWidgets'
import { DEFAULT_STEP_GOAL, DEFAULT_WATER_GOAL_ML } from '@/features/settings/hooks/useSettings'

/**
 * The daily quest: a few things to do today, taken from what the user already tracks, and bonus
 * XP for clearing all of them. Nothing happens when it isn't cleared (no penalty, no mark on the
 * day): tomorrow simply brings a new one.
 *
 * It's one objective of each kind (moving, eating, a habit), picked afresh each day from the date
 * (November 2026; it used to be the same set every day), so every device shows the same quest. A
 * kind only takes the options the user tracks (Home's cards, a plan, weigh-ins), and a kind with
 * none is left out. Objectives are the user's own targets, never invented ones, and calories
 * aren't one: a quest must never be a reason to eat less.
 */

export interface QuestObjective {
  id: 'move' | 'workout' | 'steps' | 'protein' | 'food' | 'meals' | 'breakfast' | 'water' | 'creatine' | 'weigh'
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

/** A small stable hash (FNV-1a), so a day's pick is the same everywhere. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** What a day's objectives are worked out from. */
async function dayFacts(date: string) {
  const weekday = parseISO(date).getDay()
  const [settings, targets, workouts, activity, logs, water, creatine, claim, skip, routines, weighIns, lastWeighIn] = await Promise.all([
    db.settings.get(1),
    db.targets.get(1),
    db.workouts.where('date').equals(date).count(),
    db.dailyActivity.where('date').equals(date).toArray(),
    db.foodLog.where('date').equals(date).toArray(),
    db.checkins.get(`water-${date}`),
    db.checkins.get(`creatine-${date}`),
    db.checkins.get(claimId(date)),
    db.checkins.get(`skip-${date}`),
    db.routines.toArray(),
    db.bodyMetrics.where('date').equals(date).count(),
    db.bodyMetrics.where('date').below(date).last(),
  ])
  const cards = homeWidgetsFrom(settings)
  return {
    date, settings, targets, workouts, logs, water, creatine, claim, weighIns, cards,
    steps: Math.max(0, ...activity.map(a => a.steps)),
    stepGoal: settings?.dailyStepGoal ?? DEFAULT_STEP_GOAL,
    // The day's planned routine, unless it was skipped
    planned: skip?.done ? undefined : routines.find(r => r.scheduleDays.includes(weekday)),
    tracksFood: cards.includes('calories') || cards.includes('macros'),
    // Weighing in is something they do: a weigh-in in the month before
    weighs: weighIns > 0 || (!!lastWeighIn && lastWeighIn.date >= toDateStr(subDays(parseISO(date), 30))),
  }
}

type Facts = Awaited<ReturnType<typeof dayFacts>>

interface Option {
  available: (f: Facts) => boolean
  build: (f: Facts) => QuestObjective | Promise<QuestObjective>
}

const meals = (f: Facts) => new Set(f.logs.map(l => l.mealType))
const MAIN_MEALS: MealType[] = ['breakfast', 'lunch', 'dinner']

/** The options of each kind, in a fixed order: a day starts at one picked by its date and takes the first it can. */
const KINDS: Record<'move' | 'eat' | 'habit', Option[]> = {
  move: [
    {
      available: () => true,
      build: f => ({
        id: 'move',
        label: `Train, or walk ${f.stepGoal.toLocaleString()} steps`,
        progress: f.workouts > 0 ? 'Workout logged' : `${f.steps.toLocaleString()} steps`,
        done: f.workouts > 0 || f.steps >= f.stepGoal,
      }),
    },
    {
      available: f => !!f.planned,
      build: f => ({ id: 'workout', label: `Do today’s ${f.planned?.name ?? 'workout'}`, progress: f.workouts > 0 ? 'Done' : 'Not yet', done: f.workouts > 0 }),
    },
    {
      available: f => f.cards.includes('steps'),
      build: f => ({ id: 'steps', label: `Walk ${f.stepGoal.toLocaleString()} steps`, progress: `${f.steps.toLocaleString()} / ${f.stepGoal.toLocaleString()}`, done: f.steps >= f.stepGoal }),
    },
  ],
  eat: [
    {
      available: f => f.tracksFood && (f.targets?.dailyProtein ?? 0) > 0,
      build: async f => {
        const target = f.targets?.dailyProtein ?? 0
        const foods = await db.foods.bulkGet([...new Set(f.logs.map(l => l.foodId))])
        const perServing = new Map(foods.flatMap(food => (food ? [[food.uuid, food.protein] as const] : [])))
        const protein = Math.round(f.logs.reduce((sum, l) => sum + (perServing.get(l.foodId) ?? 0) * l.servings, 0))
        return { id: 'protein', label: 'Reach your protein target', progress: `${protein} / ${target} g`, done: protein >= target }
      },
    },
    {
      available: f => f.tracksFood,
      build: f => ({ id: 'food', label: 'Log what you eat', progress: f.logs.length > 0 ? 'Logged' : 'Nothing yet', done: f.logs.length > 0 }),
    },
    {
      available: f => f.tracksFood,
      build: f => {
        const n = MAIN_MEALS.filter(m => meals(f).has(m)).length
        return { id: 'meals', label: 'Log breakfast, lunch and dinner', progress: `${n} / 3 meals`, done: n === 3 }
      },
    },
    {
      available: f => f.tracksFood,
      build: f => ({ id: 'breakfast', label: 'Log your breakfast', progress: meals(f).has('breakfast') ? 'Logged' : 'Not yet', done: meals(f).has('breakfast') }),
    },
  ],
  habit: [
    {
      available: f => f.cards.includes('water'),
      build: f => {
        const goal = f.settings?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML
        const ml = f.water?.amount ?? 0
        return { id: 'water', label: 'Drink your water', progress: `${litres(ml)} / ${litres(goal)} L`, done: ml >= goal }
      },
    },
    {
      available: f => f.cards.includes('creatine'),
      build: f => ({ id: 'creatine', label: 'Take your creatine', progress: f.creatine?.done ? 'Taken' : 'Not yet', done: !!f.creatine?.done }),
    },
    {
      available: f => f.weighs,
      build: f => ({ id: 'weigh', label: 'Weigh in', progress: f.weighIns > 0 ? 'Weighed in' : 'Not yet', done: f.weighIns > 0 }),
    },
  ],
}

/** A day's quest as it stands, from that day's logs. */
export async function loadQuest(date: string): Promise<Quest> {
  const facts = await dayFacts(date)
  const objectives: QuestObjective[] = []
  for (const [kind, options] of Object.entries(KINDS)) {
    const start = hash(`${date}:${kind}`) % options.length
    const option = options.map((_, i) => options[(start + i) % options.length]).find(o => o.available(facts))
    if (option) objectives.push(await option.build(facts))
  }
  return { date, objectives, complete: objectives.every(o => o.done), claimed: !!facts.claim?.done }
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
