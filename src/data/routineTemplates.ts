import type { Routine } from '@/types'

/**
 * Built-in starting points. They live in code (not the database) so they never
 * sync or duplicate; "Save to my routines" copies one into the user's routines.
 */
export type RoutineTemplate = Omit<Routine, 'updatedAt' | 'syncPending' | 'scheduleDays'>

const ex = (exerciseId: string, sets: number, reps: number, restSec = 90) => ({ exerciseId, sets, reps, restSec })
/** A stretch: `sets` holds of `seconds` (one per side for a one-sided stretch), paced by the hold timer, so no rest. */
const hold = (exerciseId: string, sets: number, seconds: number) => ex(exerciseId, sets, seconds, 0)

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
      ex('ex-rowing-machine', 1, 10, 0),
      ex('ex-jump-rope', 1, 6, 0),
      ex('ex-burpee', 3, 10, 60),
      ex('ex-mountain-climber', 3, 1, 45),
      ex('ex-stationary-bike', 1, 15, 0),
    ],
  },
  {
    uuid: 'tpl-full-body-stretch',
    name: 'Full Body Stretch',
    category: 'stretching',
    level: 'beginner',
    notes: 'Ten minutes head to toe, a stretch for every major muscle group. Ease in and hold still, without bouncing.',
    exercises: [
      hold('ex-neck-side-stretch', 2, 30),
      hold('ex-cross-body-shoulder-stretch', 2, 30),
      hold('ex-doorway-chest-stretch', 2, 30),
      hold('ex-overhead-triceps-stretch', 2, 30),
      hold('ex-childs-pose', 2, 30),
      hold('ex-kneeling-hip-flexor-stretch', 2, 30),
      hold('ex-standing-hamstring-stretch', 2, 30),
      hold('ex-standing-quad-stretch', 2, 30),
      hold('ex-figure-four-stretch', 2, 30),
      hold('ex-standing-calf-stretch', 2, 30),
    ],
  },
  {
    uuid: 'tpl-leg-day-stretch',
    name: 'Leg Day Cool-Down',
    category: 'stretching',
    level: 'beginner',
    notes: 'Quads, hamstrings, hips, glutes and calves, for after squats and deadlifts.',
    exercises: [
      hold('ex-standing-quad-stretch', 2, 30),
      hold('ex-kneeling-hip-flexor-stretch', 2, 30),
      hold('ex-lying-hamstring-stretch', 2, 30),
      hold('ex-pigeon-pose', 2, 45),
      hold('ex-butterfly-stretch', 2, 30),
      hold('ex-standing-calf-stretch', 2, 30),
      hold('ex-childs-pose', 1, 60),
    ],
  },
  {
    uuid: 'tpl-upper-body-stretch',
    name: 'Upper Body Stretch',
    category: 'stretching',
    level: 'beginner',
    notes: 'Neck, shoulders, chest, back and arms, for after a push or pull day or a long day at a desk.',
    exercises: [
      hold('ex-neck-side-stretch', 2, 30),
      hold('ex-upper-back-stretch', 2, 30),
      hold('ex-doorway-chest-stretch', 2, 30),
      hold('ex-cross-body-shoulder-stretch', 2, 30),
      hold('ex-overhead-triceps-stretch', 2, 30),
      hold('ex-kneeling-lat-stretch', 2, 30),
      hold('ex-biceps-wall-stretch', 2, 30),
      hold('ex-wrist-flexor-stretch', 2, 30),
    ],
  },
  {
    uuid: 'tpl-hips-back-stretch',
    name: 'Hips & Lower Back',
    category: 'stretching',
    level: 'intermediate',
    notes: 'Loosens tight hips and a stiff lower back, after a day of sitting or on a rest day.',
    exercises: [
      hold('ex-cat-cow', 1, 60),
      hold('ex-knees-to-chest', 2, 30),
      hold('ex-lying-spinal-twist', 2, 30),
      hold('ex-figure-four-stretch', 2, 30),
      hold('ex-ninety-ninety-stretch', 2, 45),
      hold('ex-frog-stretch', 2, 30),
      hold('ex-happy-baby', 1, 45),
      hold('ex-cobra-stretch', 2, 20),
    ],
  },
]

export function getTemplate(uuid: string): RoutineTemplate | undefined {
  return ROUTINE_TEMPLATES.find(t => t.uuid === uuid)
}
