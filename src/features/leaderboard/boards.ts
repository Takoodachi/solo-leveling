import { differenceInCalendarDays, parseISO } from 'date-fns'
import { REGION_LABEL, groupOfRegion, type MuscleRegion } from '@/features/ranks/standards'
import type { RegionRank } from '@/features/ranks/computeRanks'
import { formatRunTime } from '@/features/ranks/running'
import { formatKm } from '@/lib/cardio'
import { rankFor, type TierKey } from '@/features/ranks/tiers'
import type { LeaderboardEntry, LeaderboardSnapshot } from './types'

export type BoardKey = 'strength' | 'running' | 'week' | 'level'

interface Board {
  key: BoardKey
  label: string
  /** Higher is better; null = not on this board yet. */
  score: (s: LeaderboardSnapshot, weekStart: string) => number | null
  value: (s: LeaderboardSnapshot, weekStart: string) => string
  detail: (s: LeaderboardSnapshot, weekStart: string) => string
  /** Tier badge to show, for rank boards. */
  tier?: (s: LeaderboardSnapshot) => TierKey | null
  empty: string
}

const thisWeek = (s: LeaderboardSnapshot, weekStart: string) =>
  s.week?.start === weekStart ? s.week : { start: weekStart, workouts: 0, sets: 0, minutes: 0, runKm: 0 }

export const BOARDS: Board[] = [
  {
    key: 'strength', label: 'Strength',
    score: s => s.overall ?? null,
    value: s => (s.overall != null ? rankFor(s.overall).label : 'Unranked'),
    detail: s => (s.overall != null ? `${s.overall} pts` : `${Object.keys(s.groups ?? {}).length}/3 groups ranked`),
    tier: s => (s.overall != null ? rankFor(s.overall).tier.key : null),
    empty: 'Overall ranks appear once three muscle groups are ranked.',
  },
  {
    key: 'running', label: 'Running',
    score: s => s.running?.rating ?? null,
    value: s => (s.running ? rankFor(s.running.rating).label : 'No run yet'),
    detail: s => (s.running ? `Best ${formatKm(s.running.distanceKm)} in ${formatRunTime(s.running.duration)}` : 'Run 5 km+ to rank'),
    tier: s => (s.running ? rankFor(s.running.rating).tier.key : null),
    empty: 'Log a run of 5 km or more to join this board.',
  },
  {
    key: 'week', label: 'This week',
    score: (s, w) => {
      const t = thisWeek(s, w)
      // Workouts first, then time trained (counts lifting and cardio alike).
      return t.workouts > 0 ? t.workouts * 10_000 + t.minutes : null
    },
    value: (s, w) => {
      const n = thisWeek(s, w).workouts
      return `${n} ${n === 1 ? 'workout' : 'workouts'}`
    },
    detail: (s, w) => {
      const t = thisWeek(s, w)
      return [`${t.minutes} min`, t.sets > 0 && `${t.sets} sets`, t.runKm > 0 && `${t.runKm} km run`].filter(Boolean).join(' · ')
    },
    empty: 'Resets every Monday. Finish a workout to get on it.',
  },
  {
    key: 'level', label: 'Level',
    score: s => s.xp ?? 0,
    value: s => `Level ${s.level ?? 1}`,
    detail: s => `${(s.xp ?? 0).toLocaleString()} XP · ${s.streak ?? 0}-day streak`,
    empty: '',
  },
]

export function boardOf(key: BoardKey): Board {
  return BOARDS.find(b => b.key === key)!
}

/** Entries on a board, best first; those without a score follow, by name. */
export function standings(entries: LeaderboardEntry[], board: Board, weekStart: string) {
  const scored = entries.map(e => ({ entry: e, score: board.score(e.snapshot, weekStart) }))
  return [
    ...scored.filter(x => x.score != null).sort((a, b) => b.score! - a.score!),
    ...scored.filter(x => x.score == null).sort((a, b) => a.entry.name.localeCompare(b.entry.name)),
  ]
}

/** A shared snapshot as Bodygraph regions. */
export function regionsOf(s: LeaderboardSnapshot): RegionRank[] {
  return (Object.keys(REGION_LABEL) as MuscleRegion[]).map(key => {
    const r = s.regions?.[key]
    return { key, label: REGION_LABEL[key], group: groupOfRegion(key), rank: r ? rankFor(r.r) : null, topLift: r?.by || null }
  })
}

export const profileLink = (e: Pick<LeaderboardEntry, 'me' | 'userId'>) => `/leaderboard/${e.me ? 'me' : e.userId}`

export function initials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** "today", "yesterday", "3d ago", "2w ago". */
export function ago(date: string, now: Date): string {
  const days = differenceInCalendarDays(now, parseISO(date))
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return days < 14 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`
}
