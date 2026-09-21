import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Challenge } from '@/types'
import { requestSync, deleteSynced } from '@/lib/sync'
import { today } from '@/lib/date'
import { setVolume } from '@/lib/workoutMath'

export interface ChallengeWithProgress extends Challenge {
  progress: number
  status: 'upcoming' | 'active' | 'completed' | 'ended'
}

async function progressFor(c: Challenge): Promise<number> {
  const end = c.endDate < today() ? c.endDate : today()
  if (end < c.startDate) return 0
  const range = [c.startDate, end, true, true] as const

  switch (c.metric) {
    case 'workouts':
      return db.workouts.where('date').between(...range).count()
    case 'steps':
      return (await db.dailyActivity.where('date').between(...range).toArray()).reduce((sum, a) => sum + a.steps, 0)
    case 'volume': {
      const workouts = await db.workouts.where('date').between(...range).toArray()
      if (workouts.length === 0) return 0
      const sets = await db.workoutSets.where('workoutId').anyOf(workouts.map(w => w.uuid)).toArray()
      return Math.round(sets.reduce((sum, s) => sum + setVolume(s), 0))
    }
    case 'food-days':
      return new Set((await db.foodLog.where('date').between(...range).toArray()).map(l => l.date)).size
    case 'protein-days': {
      const [logs, targets] = await Promise.all([db.foodLog.where('date').between(...range).toArray(), db.targets.get(1)])
      const goal = targets?.dailyProtein ?? 0
      if (goal <= 0) return 0
      const foods = new Map((await db.foods.bulkGet([...new Set(logs.map(l => l.foodId))])).flatMap(f => (f ? [[f.uuid, f]] : [])))
      const perDay = new Map<string, number>()
      for (const l of logs) perDay.set(l.date, (perDay.get(l.date) ?? 0) + (foods.get(l.foodId)?.protein ?? 0) * l.servings)
      return [...perDay.values()].filter(p => p >= goal).length
    }
  }
}

function statusFor(c: Challenge, progress: number): ChallengeWithProgress['status'] {
  const t = today()
  if (progress >= c.target) return 'completed'
  if (t < c.startDate) return 'upcoming'
  if (t > c.endDate) return 'ended'
  return 'active'
}

/** All challenges with live progress, active ones first (soonest ending first). */
export function useChallenges(): ChallengeWithProgress[] | undefined {
  return useLiveQuery(async () => {
    const list = await db.challenges.toArray()
    const withProgress = await Promise.all(list.map(async c => {
      const progress = await progressFor(c)
      return { ...c, progress, status: statusFor(c, progress) }
    }))
    const rank = { active: 0, upcoming: 1, completed: 2, ended: 3 } as const
    return withProgress.sort((a, b) => rank[a.status] - rank[b.status] || a.endDate.localeCompare(b.endDate))
  }, [])
}

export async function saveChallenge(c: Omit<Challenge, 'updatedAt' | 'syncPending'>): Promise<void> {
  await db.challenges.put({ ...c, updatedAt: Date.now(), syncPending: true })
  requestSync()
}

export async function deleteChallenge(uuid: string): Promise<void> {
  await deleteSynced(db.challenges, 'challenges', [uuid])
}
