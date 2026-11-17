import { describe, expect, it } from 'vitest'
import type { LeaderboardSnapshot } from '@/features/leaderboard/types'
import { sharedBest } from '@/features/leaderboard/boards'
import { RUNNING_SOURCE, bestBehind, type LiftRank, type RegionRank } from './computeRanks'
import { rankFor } from './tiers'

// What the tapped muscle's card shows under its rank: the set that earned it
const region = (topLift: string | null): RegionRank => ({ key: 'chest', label: 'Chest', group: 'chest', rank: rankFor(520), topLift })
const lift = (name: string, best: LiftRank['best']): LiftRank => ({ exerciseId: 'ex-x', name, group: 'chest', regions: ['chest'], rank: rankFor(520), best })
const running = { rank: rankFor(600), best: { distanceKm: 21.1, duration: 118, date: '2026-11-02', equivalent5k: 25 } }

describe('bestBehind (your own ranks)', () => {
  const ranks = { lifts: [lift('Incline Dumbbell Press', { weight: 42.5, reps: 10, date: '2026-11-10' })], running }

  it("gives the top lift's best set and its day", () => {
    expect(bestBehind(region('Incline Dumbbell Press'), ranks)).toEqual({ set: '42.5 kg × 10', date: '2026-11-10' })
  })

  it('gives the best run when running ranks the muscle', () => {
    expect(bestBehind(region(RUNNING_SOURCE), ranks)).toEqual({ set: '21.1 km in 1:58:00', date: '2026-11-02' })
  })

  it('gives nothing for a muscle nothing ranks', () => {
    expect(bestBehind(region(null), ranks)).toBeNull()
  })
})

describe("sharedBest (a friend's snapshot)", () => {
  const s = {
    lifts: [{ name: 'Barbell Bench Press', rating: 520, best: '100 kg × 5', date: '2026-11-08' }],
    running: { rating: 600, fiveK: 25, distanceKm: 21.1, duration: 118, date: '2026-11-02' },
  } as Partial<LeaderboardSnapshot> as LeaderboardSnapshot

  it('gives the set when the lift is among the ones they share', () => {
    expect(sharedBest(s, region('Barbell Bench Press'))).toEqual({ set: '100 kg × 5', date: '2026-11-08' })
    expect(sharedBest(s, region(RUNNING_SOURCE))).toEqual({ set: '21.1 km in 1:58:00', date: '2026-11-02' })
  })

  it('gives nothing when it isn’t, or the snapshot has no lifts', () => {
    expect(sharedBest(s, region('Cable Fly'))).toBeNull()
    expect(sharedBest({} as LeaderboardSnapshot, region('Barbell Bench Press'))).toBeNull()
  })
})
