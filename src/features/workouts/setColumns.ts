import type { SetMode } from '@/lib/workoutMath'

export type SetField = 'weight' | 'reps' | 'duration' | 'distanceKm'

/** Logger columns per set mode: [field, label, keyboard]. */
export const SET_COLUMNS: Record<SetMode, [SetField, string, 'decimal' | 'numeric'][]> = {
  load:     [['weight', 'kg', 'decimal'], ['reps', 'reps', 'numeric']],
  time:     [['duration', 'min', 'decimal'], ['distanceKm', 'km', 'decimal']],
  distance: [['distanceKm', 'km', 'decimal'], ['duration', 'min', 'decimal']],
}
