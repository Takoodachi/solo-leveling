import { create } from 'zustand'

/**
 * Where the workout screen puts its rest timer and its music controls (Settings → Workouts). Per
 * device, like the music app: what suits a phone held in one hand needn't suit a laptop.
 */

export type Edge = 'top' | 'bottom'

export interface WorkoutLayout {
  /** The rest countdown: under the header, or floating at the bottom (the default). */
  rest: Edge
  /** Previous / play-pause / next: under the header (the default), or floating at the bottom. */
  music: Edge
}

const KEY = 'solo:workoutLayout'

function saved(): WorkoutLayout {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<WorkoutLayout> | null
    return { rest: v?.rest === 'top' ? 'top' : 'bottom', music: v?.music === 'bottom' ? 'bottom' : 'top' }
  } catch {
    return { rest: 'bottom', music: 'top' }
  }
}

export const useWorkoutLayout = create<WorkoutLayout>(() => saved())

export function setWorkoutLayout(change: Partial<WorkoutLayout>): void {
  const next = { ...useWorkoutLayout.getState(), ...change }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // kept until the app restarts
  }
  useWorkoutLayout.setState(next)
}
