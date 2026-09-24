import type { MuscleGroup, MuscleRegion } from '@/features/ranks/standards'

/**
 * What an account shares with friends, built on the device and published as one
 * JSON row. Ratings are 1–1000 (turn into tiers with `rankFor`). Never contains
 * food, body weight or notes. Readers must tolerate missing fields (older clients).
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
