import { db } from './index'
import { BUILT_IN_EXERCISES } from '@/data/exercises'
import { BUILT_IN_FOODS } from '@/data/foods'

export async function seedDatabase(): Promise<void> {
  const exerciseCount = await db.exercises.count()
  if (exerciseCount === 0) {
    await db.exercises.bulkAdd(BUILT_IN_EXERCISES)
  }

  const foodCount = await db.foods.count()
  if (foodCount === 0) {
    await db.foods.bulkAdd(BUILT_IN_FOODS)
  }

  const stats = await db.userStats.get(1)
  if (!stats) {
    await db.userStats.add({
      id: 1,
      xp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      streakFreezes: 0,
    })
  }

  const targets = await db.targets.get(1)
  if (!targets) {
    await db.targets.add({
      id: 1,
      dailyKcal: 2000,
      dailyProtein: 150,
      dailyCarbs: 200,
      dailyFat: 65,
      updatedAt: Date.now(),
    })
  }

  const settings = await db.settings.get(1)
  if (!settings) {
    await db.settings.add({
      id: 1,
      defaultRestSeconds: 90,
      barWeightKg: 20,
    })
  }
}
