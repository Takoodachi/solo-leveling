import { useLiveQuery } from 'dexie-react-hooks'
import { parseISO } from 'date-fns'
import { db } from '@/db'
import { today } from '@/lib/date'
import { targetsForDay, type DayPlan, type EffectiveTargets } from '@/lib/macroTargets'
import { loadStepBurns, type StepBurn } from '@/lib/stepCalories'

export interface CalorieBudget {
  targets: EffectiveTargets
  /** What the day's steps burned; null when no steps are logged or step calories are off. */
  burn: StepBurn | null
}

/** The day's targets plus its step calories. Use this everywhere a target is shown. */
export function useCalorieBudget(date?: string): CalorieBudget {
  const day = date ?? today()
  const data = useLiveQuery(async () => {
    const [baseline, burns, settings, routines, skip] = await Promise.all([
      db.targets.get(1), loadStepBurns([day]), db.settings.get(1), db.routines.toArray(), db.checkins.get(`skip-${day}`),
    ])
    const burn = burns.get(day) ?? null
    const weekdays = new Set(routines.flatMap(r => r.scheduleDays))
    const plan: DayPlan | undefined = settings?.trainingDayCarbs !== false && weekdays.size > 0
      ? { training: weekdays.has(parseISO(day).getDay()) && !skip?.done, perWeek: weekdays.size }
      : undefined
    return { targets: targetsForDay(baseline, burn?.kcal ?? 0, plan), burn }
  }, [day])
  return data ?? { targets: targetsForDay(undefined, 0), burn: null }
}

/** Calories eaten minus what steps burned. */
export function netKcal(eaten: number, burn: StepBurn | null): number {
  return eaten - (burn?.kcal ?? 0)
}
