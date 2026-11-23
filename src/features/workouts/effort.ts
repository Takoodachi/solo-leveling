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

/**
 * The rpe a lift's set is saved with: 10 when it was taken to failure (on any set: the same "None"
 * left), else on the last ordinary set the reps-left answer; none on a row carrying another on.
 */
export function liftRpe(s: { kind?: string | null; failure?: boolean }, last: boolean, effort: Effort | undefined): number | undefined {
  if (s.kind) return undefined
  if (s.failure) return 10
  return last ? effortRpe(effort) : undefined
}

export function effortFromRpe(rpe: number | undefined): Effort | undefined {
  if (rpe == null) return undefined
  return rpe <= 7 ? 'easy' : rpe >= 10 ? 'hard' : 'right'
}
