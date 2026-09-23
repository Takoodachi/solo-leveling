import type { SetMode } from '@/lib/workoutMath'

export type SetField = 'weight' | 'reps' | 'duration' | 'distanceKm'
export type SetRowMode = Exclude<SetMode, 'cardio'> // cardio is one entry, not set rows

/** Logger columns per set mode: [field, label, keyboard]. */
export const SET_COLUMNS: Record<SetRowMode, [SetField, string, 'decimal' | 'numeric'][]> = {
  load: [['weight', 'kg', 'decimal'], ['reps', 'reps', 'numeric']],
  time: [['duration', 'min', 'decimal']],
}

/** Grid for header + rows: set #, previous, one cell per column, done. */
export const SET_GRID: Record<SetRowMode, string> = {
  load: '2rem minmax(0,1fr) 4.5rem 4.5rem 2.75rem',
  time: '2rem minmax(0,1fr) 9.5rem 2.75rem',
}
