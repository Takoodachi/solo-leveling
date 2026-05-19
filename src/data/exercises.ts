import type { Exercise } from '@/types'

const NOW = 0 // seed data has updatedAt=0 so real user updates always win

const IMG = 'https://wger.de/media/exercise-images'

export const BUILT_IN_EXERCISES: Exercise[] = [
  // ── Strength ────────────────────────────────────────────────────
  { uuid: 'ex-barbell-back-squat',       name: 'Barbell Back Squat',       category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/1801/60043328-1cfb-4289-9865-aaf64d5aaa28.jpg` },
  { uuid: 'ex-barbell-front-squat',      name: 'Barbell Front Squat',      category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/191/Front-squat-1-857x1024.png` },
  { uuid: 'ex-romanian-deadlift',        name: 'Romanian Deadlift',        category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/1652/0306c8c0-70cc-45d4-92de-6fa72ceaa834.webp` },
  { uuid: 'ex-conventional-deadlift',    name: 'Conventional Deadlift',    category: 'Back',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg` },
  { uuid: 'ex-barbell-bench-press',      name: 'Barbell Bench Press',      category: 'Chest',         type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/192/Bench-press-1.png` },
  { uuid: 'ex-incline-barbell-press',    name: 'Incline Barbell Press',    category: 'Chest',         type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/41/Incline-bench-press-1.png` },
  { uuid: 'ex-overhead-press',           name: 'Overhead Press',           category: 'Shoulders',     type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/1893/7dbad19e-0616-41fd-9d7d-3e21649c0eea.png` },
  { uuid: 'ex-barbell-row',              name: 'Barbell Row',              category: 'Back',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/109/Barbell-rear-delt-row-1.png` },
  { uuid: 'ex-barbell-hip-thrust',       name: 'Barbell Hip Thrust',       category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-leg-press',                name: 'Leg Press',                category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp` },
  { uuid: 'ex-leg-curl',                 name: 'Leg Curl',                 category: 'Lower Body',    type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/364/b318dde9-f5f2-489f-940a-cd864affb9e3.png` },
  { uuid: 'ex-lat-pulldown',             name: 'Lat Pulldown',             category: 'Back',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/158/02e8a7c3-dc67-434e-a4bc-77fdecf84b49.webp` },
  { uuid: 'ex-cable-row',                name: 'Cable Row',                category: 'Back',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/1117/e74255c0-67a0-4309-b78d-2d79e6ff8c11.png` },
  { uuid: 'ex-dumbbell-curl',            name: 'Dumbbell Curl',            category: 'Arms',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/81/Biceps-curl-1.png` },
  { uuid: 'ex-hammer-curl',              name: 'Hammer Curl',              category: 'Arms',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/86/Bicep-hammer-curl-1.png` },
  { uuid: 'ex-lateral-raise',            name: 'Lateral Raise',            category: 'Shoulders',     type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/148/lateral-dumbbell-raises-large-2.png` },
  { uuid: 'ex-tricep-pushdown',          name: 'Tricep Pushdown',          category: 'Arms',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/805/7a437824-e2cc-46e1-804a-674f0ea31d25.png` },
  { uuid: 'ex-face-pull',                name: 'Face Pull',                category: 'Shoulders',     type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW },
  { uuid: 'ex-dumbbell-row',             name: 'Dumbbell Row',             category: 'Back',          type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/81/a751a438-ae2d-4751-8d61-cef0e9292174.png` },
  { uuid: 'ex-dumbbell-shoulder-press',  name: 'Dumbbell Shoulder Press',  category: 'Shoulders',     type: 'strength',   defaultUnit: 'kg',   isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/123/dumbbell-shoulder-press-large-1.png` },

  // ── Bodyweight ───────────────────────────────────────────────────
  { uuid: 'ex-pull-up',                  name: 'Pull-Up',                  category: 'Back',          type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/475/b0554016-16fd-4dbe-be47-a2a17d16ae0e.jpg` },
  { uuid: 'ex-chin-up',                  name: 'Chin-Up',                  category: 'Back',          type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/181/Chin-ups-2.png` },
  { uuid: 'ex-dip',                      name: 'Dip',                      category: 'Arms',          type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/194/34600351-8b0b-4cb0-8daa-583537be15b0.png` },
  { uuid: 'ex-push-up',                  name: 'Push-Up',                  category: 'Chest',         type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png` },
  { uuid: 'ex-inverted-row',             name: 'Inverted Row',             category: 'Back',          type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/1198/864906ac-4ac7-4e52-a886-c6bb97950a9f.jpg` },
  { uuid: 'ex-plank',                    name: 'Plank',                    category: 'Core',          type: 'bodyweight', defaultUnit: 'min',  isCustom: false, updatedAt: NOW },
  { uuid: 'ex-hanging-leg-raise',        name: 'Hanging Leg Raise',        category: 'Core',          type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/979/27097a3a-5749-428d-b94c-6082afe390f6.png` },
  { uuid: 'ex-pistol-squat',             name: 'Pistol Squat',             category: 'Lower Body',    type: 'bodyweight', defaultUnit: 'reps', isCustom: false, updatedAt: NOW, imageUrl: `${IMG}/456/3b681e59-377b-40db-9113-ca5873ce084b.jpg` },

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
