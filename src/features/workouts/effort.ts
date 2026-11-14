/**
 * How many reps were left after an exercise's last set, asked once that set is ticked (EffortRow)
 * and read by the tips next time (progression.ts): a set that left three or more counts for more
 * than its reps, and one that took everything while still under the range means the weight is
 * too heavy. It's kept on that last set in the synced `rpe`, which lifts never used (cardio's own
 * effort is another scale, on other exercises), so it needed no column.
 */
export type Effort = 'easy' | 'right' | 'hard'

export const EFFORTS: { value: Effort; label: string; tag: string; rpe: number }[] = [
  { value: 'easy', label: '3+', tag: '3+ left', rpe: 7 },
  { value: 'right', label: '1–2', tag: '1–2 left', rpe: 8 },
  { value: 'hard', label: 'None', tag: 'none left', rpe: 10 },
]

export const effortRpe = (effort: Effort | undefined): number | undefined => EFFORTS.find(e => e.value === effort)?.rpe

export function effortFromRpe(rpe: number | undefined): Effort | undefined {
  if (rpe == null) return undefined
  return rpe <= 7 ? 'easy' : rpe >= 10 ? 'hard' : 'right'
}
