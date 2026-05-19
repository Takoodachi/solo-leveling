import type { Exercise } from '@/types'

const NOW = 0 // seed data has updatedAt=0 so real user updates always win

export const BUILT_IN_EXERCISES: Exercise[] = [
  // ── Strength ────────────────────────────────────────────────────
  { uuid: 'ex-barbell-back-squat',       name: 'Barbell Back Squat',       category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-barbell-front-squat',      name: 'Barbell Front Squat',      category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-romanian-deadlift',        name: 'Romanian Deadlift',        category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-conventional-deadlift',    name: 'Conventional Deadlift',    category: 'Back',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-barbell-bench-press',      name: 'Barbell Bench Press',      category: 'Chest',         type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-incline-barbell-press',    name: 'Incline Barbell Press',    category: 'Chest',         type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-overhead-press',           name: 'Overhead Press',           category: 'Shoulders',     type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-barbell-row',              name: 'Barbell Row',              category: 'Back',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-barbell-hip-thrust',       name: 'Barbell Hip Thrust',       category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-leg-press',                name: 'Leg Press',                category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-leg-curl',                 name: 'Leg Curl',                 category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-lat-pulldown',             name: 'Lat Pulldown',             category: 'Back',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-cable-row',                name: 'Cable Row',                category: 'Back',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-dumbbell-curl',            name: 'Dumbbell Curl',            category: 'Arms',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-hammer-curl',              name: 'Hammer Curl',              category: 'Arms',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-lateral-raise',            name: 'Lateral Raise',            category: 'Shoulders',     type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-tricep-pushdown',          name: 'Tricep Pushdown',          category: 'Arms',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-face-pull',                name: 'Face Pull',                category: 'Shoulders',     type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-dumbbell-row',             name: 'Dumbbell Row',             category: 'Back',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-dumbbell-shoulder-press',  name: 'Dumbbell Shoulder Press',  category: 'Shoulders',     type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },

  // ── Bodyweight ───────────────────────────────────────────────────
  { uuid: 'ex-pull-up',                  name: 'Pull-Up',                  category: 'Back',          type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW },
  { uuid: 'ex-chin-up',                  name: 'Chin-Up',                  category: 'Back',          type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW },
  { uuid: 'ex-dip',                      name: 'Dip',                      category: 'Arms',          type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW },
  { uuid: 'ex-push-up',                  name: 'Push-Up',                  category: 'Chest',         type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW },
  { uuid: 'ex-inverted-row',             name: 'Inverted Row',             category: 'Back',          type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW },
  { uuid: 'ex-plank',                    name: 'Plank',                    category: 'Core',          type: 'bodyweight', defaultUnit: 'min',  isCustom: false, updatedAt: NOW },
  { uuid: 'ex-hanging-leg-raise',        name: 'Hanging Leg Raise',        category: 'Core',          type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW },
  { uuid: 'ex-pistol-squat',             name: 'Pistol Squat',             category: 'Lower Body',    type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW },

  // ── Cardio ───────────────────────────────────────────────────────
  { uuid: 'ex-running',                  name: 'Running',                  category: 'Cardio',        type: 'cardio',     defaultUnit: 'km',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-cycling',                  name: 'Cycling',                  category: 'Cardio',        type: 'cardio',     defaultUnit: 'km',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-rowing-machine',           name: 'Rowing Machine',           category: 'Cardio',        type: 'cardio',     defaultUnit: 'min',  isCustom: false, updatedAt: NOW },
  { uuid: 'ex-jump-rope',                name: 'Jump Rope',                category: 'Cardio',        type: 'cardio',     defaultUnit: 'min',  isCustom: false, updatedAt: NOW },
  { uuid: 'ex-elliptical',               name: 'Elliptical',               category: 'Cardio',        type: 'cardio',     defaultUnit: 'min',  isCustom: false, updatedAt: NOW },
  { uuid: 'ex-stair-climber',            name: 'Stair Climber',            category: 'Cardio',        type: 'cardio',     defaultUnit: 'min',  isCustom: false, updatedAt: NOW },
  { uuid: 'ex-swimming',                 name: 'Swimming',                 category: 'Cardio',        type: 'cardio',     defaultUnit: 'min',  isCustom: false, updatedAt: NOW },
]

export const EXERCISE_CATEGORIES = [
  'Back', 'Chest', 'Shoulders', 'Arms', 'Lower Body', 'Core', 'Cardio',
] as const
