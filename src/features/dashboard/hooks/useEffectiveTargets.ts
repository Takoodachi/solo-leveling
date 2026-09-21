import { useTargets } from '@/features/nutrition/hooks/useTargets'
import { useDynamicTargets } from './useDynamicTargets'

export interface EffectiveTargets {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/**
 * The target to show for a day: the activity-adjusted one when dynamic targets
 * are on, otherwise the user's baseline. Use this everywhere a target is shown.
 */
export function useEffectiveTargets(date?: string) {
  const { targets } = useTargets()
  const dyn = useDynamicTargets(date)
  const effective: EffectiveTargets = dyn.dynamic && dyn.targets
    ? dyn.targets
    : {
        kcal: targets?.dailyKcal ?? 2000,
        protein: targets?.dailyProtein ?? 150,
        carbs: targets?.dailyCarbs ?? 200,
        fat: targets?.dailyFat ?? 65,
      }
  return { targets: effective, dynamic: dyn }
}
