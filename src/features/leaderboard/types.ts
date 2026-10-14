import type { MuscleGroup, MuscleRegion } from '@/features/ranks/standards'
import type { Exercise, ExerciseType, RoutineCategory, RoutineLevel } from '@/types'

/**
 * What an account shares with friends, built on the device and published as one
 * JSON row. Ratings are 1–1000 (turn into tiers with `rankFor`). Never contains
 * food, body weight or notes (a shared routine leaves its notes behind). Readers must tolerate missing fields (older clients).
 */
export interface LeaderboardSnapshot {
  v: 1
  level: number
  xp: number
  /** Current day streak (0 once it has lapsed). */
  streak: number
  /** Overall strength rating; null until three muscle groups are ranked. */
  overall: number | null
  groups: Partial<Record<MuscleGroup, number>>
  /** Bodygraph: each ranked muscle's rating and the lift (or "Running") behind it. */
  regions: Partial<Record<MuscleRegion, { r: number; by: string }>>
  running: { rating: number; fiveK: number; distanceKm: number; duration: number; date: string } | null
  /** Strongest ranked lifts. */
  lifts: SharedLift[]
  /** End of each of the last 12 weeks: overall and running rating. */
  history: { d: string; o: number | null; r: number | null }[]
  /** Monday–Sunday training totals for the week starting `start`. */
  week: { start: string; workouts: number; sets: number; minutes: number; runKm: number }
  /** New bests from the last two weeks, newest first. */
  highlights: Highlight[]
  /** Profile photo: a small JPEG data URL (absent = initials). Check with safeAvatar before drawing. */
  avatar?: string
  /** Their routines, for friends to look through and copy. Read a friend's through cleanSharedRoutines. */
  routines?: SharedRoutine[]
}

/** A routine as friends see it: no notes, and its custom exercises described, since other devices don't have them. */
export interface SharedRoutine {
  id: string
  name: string
  category: RoutineCategory
  level: RoutineLevel
  /** Its own time estimate, when one was set. */
  mins?: number
  /** Weekdays it's planned on, 0 = Sunday. */
  days: number[]
  items: SharedRoutineItem[]
}

export interface SharedRoutineItem {
  /** The exercise's id: every device knows the built-in ones. */
  id: string
  sets: number
  reps: number
  rest: number
  /** A custom exercise, described. */
  ex?: { name: string; category: string; type: ExerciseType; unit: Exercise['defaultUnit'] }
}

export interface SharedLift {
  name: string
  rating: number
  /** "100 kg × 5", "15 reps", "1:30 hold". */
  best: string
  date: string
}

export interface Highlight {
  kind: 'lift' | 'run'
  name: string
  rating: number
  detail: string
  date: string
}

export interface LeaderboardEntry {
  userId: string
  name: string
  snapshot: LeaderboardSnapshot
  /** ISO time of the last publish. */
  updatedAt: string
  me: boolean
}
