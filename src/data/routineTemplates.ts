import type { Routine } from '@/types'

/**
 * Built-in starting points. They live in code (not the database) so they never
 * sync or duplicate; "Save to my routines" copies one into the user's routines.
 */
export type RoutineTemplate = Omit<Routine, 'updatedAt' | 'syncPending' | 'scheduleDays'>

const ex = (exerciseId: string, sets: number, reps: number, restSec = 90) => ({ exerciseId, sets, reps, restSec })

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    uuid: 'tpl-full-body',
    name: 'Full Body Strength',
    category: 'full-body',
    level: 'intermediate',
    notes: 'Build strength across your entire body with focused compound lifts.',
    exercises: [
      ex('ex-barbell-back-squat', 3, 8, 120),
      ex('ex-barbell-bench-press', 3, 8, 120),
      ex('ex-barbell-row', 3, 8),
      ex('ex-romanian-deadlift', 3, 10),
      ex('ex-overhead-press', 3, 10),
      ex('ex-knee-raise', 3, 12, 60),
    ],
  },
  {
    uuid: 'tpl-upper-burn',
    name: 'Upper Burn',
    category: 'strength',
    level: 'advanced',
    notes: 'High-volume push and pull for chest, back, shoulders and arms.',
    exercises: [
      ex('ex-incline-dumbbell-press', 4, 10),
      ex('ex-pull-up', 4, 8),
      ex('ex-dumbbell-shoulder-press', 3, 10),
      ex('ex-cable-row', 3, 12),
      ex('ex-lateral-raise', 3, 15, 60),
      ex('ex-tricep-pushdown', 3, 12, 60),
      ex('ex-hammer-curl', 3, 12, 60),
    ],
  },
  {
    uuid: 'tpl-strength-boost',
    name: 'Strength Boost',
    category: 'strength',
    level: 'beginner',
    notes: 'Simple machine and dumbbell basics to learn the movements.',
    exercises: [
      ex('ex-goblet-squat', 3, 10),
      ex('ex-dumbbell-bench-press', 3, 10),
      ex('ex-lat-pulldown', 3, 10),
      ex('ex-glute-bridge', 3, 12, 60),
      ex('ex-dead-bug', 3, 10, 45),
    ],
  },
  {
    uuid: 'tpl-legs-core',
    name: 'Legs & Core',
    category: 'core',
    level: 'beginner',
    notes: 'Lower-body and core work with light equipment.',
    exercises: [
      ex('ex-bulgarian-split-squat', 3, 10),
      ex('ex-glute-bridge', 3, 12, 60),
      ex('ex-lying-leg-curl', 3, 12, 60),
      ex('ex-plank', 3, 1, 45),
      ex('ex-russian-twist', 3, 20, 45),
    ],
  },
  {
    uuid: 'tpl-cardio-kick',
    name: 'Cardio Kick',
    category: 'cardio',
    level: 'intermediate',
    notes: 'Mixed conditioning: steady rowing, rope work and intervals.',
    exercises: [
      ex('ex-rowing-machine', 1, 10, 60),
      ex('ex-jump-rope', 3, 2, 60),
      ex('ex-burpee', 3, 10, 60),
      ex('ex-mountain-climber', 3, 1, 45),
      ex('ex-stationary-bike', 1, 15, 0),
    ],
  },
]

export function getTemplate(uuid: string): RoutineTemplate | undefined {
  return ROUTINE_TEMPLATES.find(t => t.uuid === uuid)
}
