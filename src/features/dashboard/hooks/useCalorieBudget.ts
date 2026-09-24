import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { today } from '@/lib/date'
import { targetsForDay, type EffectiveTargets } from '@/lib/macroTargets'
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
    const [baseline, burns] = await Promise.all([db.targets.get(1), loadStepBurns([day])])
    const burn = burns.get(day) ?? null
    return { targets: targetsForDay(baseline, burn?.kcal ?? 0), burn }
  }, [day])
  return data ?? { targets: targetsForDay(undefined, 0), burn: null }
}

/** Calories eaten minus what steps burned. */
export function netKcal(eaten: number, burn: StepBurn | null): number {
  return eaten - (burn?.kcal ?? 0)
}
