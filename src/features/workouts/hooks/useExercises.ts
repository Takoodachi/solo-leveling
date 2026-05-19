import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Exercise } from '@/types'
import { syncService } from '@/lib/sync'
import { useAuthStore } from '@/features/auth/authStore'

export function useExercises() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])

  function searchExercises(query: string): Exercise[] {
    if (!exercises) return []
    const q = query.toLowerCase().trim()
    if (!q) return exercises
    return exercises.filter(
      e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    )
  }

  function groupByCategory(list: Exercise[]): Record<string, Exercise[]> {
    return list.reduce<Record<string, Exercise[]>>((acc, e) => {
      const cat = e.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(e)
      return acc
    }, {})
  }

  async function createCustomExercise(
    data: Omit<Exercise, 'uuid' | 'isCustom' | 'updatedAt' | 'syncPending'>
  ): Promise<Exercise> {
    const exercise: Exercise = {
      ...data,
      uuid: crypto.randomUUID(),
      isCustom: true,
      updatedAt: Date.now(),
      syncPending: true,
    }
    await db.exercises.add(exercise)
    const userId = useAuthStore.getState().userId
    if (userId) void syncService.sync(userId)
    return exercise
  }

  return { exercises: exercises ?? [], searchExercises, groupByCategory, createCustomExercise }
}
