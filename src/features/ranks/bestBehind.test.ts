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
  const ranks = { lifts: [lift('Incline Dumbbell Press', { weight: 42.5, reps: 10, date: '2026-11-10' }), lift('Barbell Bench Press', { weight: 61.23, reps: 5, date: '2026-11-11' })], running }

  it("gives the top lift's best set and its day, in the unit shown", () => {
    expect(bestBehind(region('Incline Dumbbell Press'), ranks, 'kg')).toEqual({ set: '42.5 kg × 10', date: '2026-11-10' })
    expect(bestBehind(region('Barbell Bench Press'), ranks, 'lb')).toEqual({ set: '135 lb × 5', date: '2026-11-11' }) // 135 lb as it's stored
  })

  it('gives the best run when running ranks the muscle', () => {
    expect(bestBehind(region(RUNNING_SOURCE), ranks, 'lb')).toEqual({ set: '21.1 km in 1:58:00', date: '2026-11-02' })
  })

  it('gives nothing for a muscle nothing ranks', () => {
    expect(bestBehind(region(null), ranks, 'kg')).toBeNull()
  })
})

describe("sharedBest (a friend's snapshot)", () => {
  const s = {
    lifts: [
      { name: 'Barbell Bench Press', rating: 520, best: '100 kg × 5', set: { w: 100, r: 5 }, date: '2026-11-08' },
      // From an app before the numbers were sent: only the text
      { name: 'Barbell Row', rating: 480, best: '80 kg × 8', date: '2026-11-07' },
    ],
    running: { rating: 600, fiveK: 25, distanceKm: 21.1, duration: 118, date: '2026-11-02' },
  } as Partial<LeaderboardSnapshot> as LeaderboardSnapshot

  it('gives the set in your unit when the lift is among the ones they share', () => {
    expect(sharedBest(s, region('Barbell Bench Press'), 'kg')).toEqual({ set: '100 kg × 5', date: '2026-11-08' })
    expect(sharedBest(s, region('Barbell Bench Press'), 'lb')).toEqual({ set: '220.5 lb × 5', date: '2026-11-08' })
    expect(sharedBest(s, region(RUNNING_SOURCE), 'lb')).toEqual({ set: '21.1 km in 1:58:00', date: '2026-11-02' })
  })

  it('falls back to their own words when it has no numbers, or numbers no set could have', () => {
    expect(sharedBest(s, region('Barbell Row'), 'lb')).toEqual({ set: '80 kg × 8', date: '2026-11-07' })
    const odd = { lifts: [{ name: 'Barbell Bench Press', rating: 520, best: '100 kg × 5', set: { w: 1e9, r: -1 }, date: '2026-11-08' }] } as Partial<LeaderboardSnapshot> as LeaderboardSnapshot
    expect(sharedBest(odd, region('Barbell Bench Press'), 'lb')?.set).toBe('100 kg × 5')
  })

  it('gives nothing when it isn’t, or the snapshot has no lifts', () => {
    expect(sharedBest(s, region('Cable Fly'), 'kg')).toBeNull()
    expect(sharedBest({} as LeaderboardSnapshot, region('Barbell Bench Press'), 'kg')).toBeNull()
  })
})
