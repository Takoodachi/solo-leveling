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
  // Reps are two digits; the room goes to Previous, which reads "181.5×8" on a 360 px phone
  load: '1.5rem minmax(0,1fr) 4.5rem 3.5rem 2.75rem',
  time: '2rem minmax(0,1fr) 9.5rem 2.75rem',
}
