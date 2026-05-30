import { db } from './index'
import { BUILT_IN_EXERCISES } from '@/data/exercises'
import { BUILT_IN_FOODS } from '@/data/foods'

export async function seedDatabase(): Promise<void> {
  // Always upsert built-in exercises so imageUrl / muscle data is refreshed on existing installs
  await db.exercises.bulkPut(BUILT_IN_EXERCISES)

  // Upsert built-in foods on every start so existing installs pick up catalog growth.
  // Preserve user-set isFavorite — built-ins start as isFavorite: false but the user may have favorited them.
  const builtInFoodUuids = BUILT_IN_FOODS.map(f => f.uuid)
  const existingBuiltInFoods = await db.foods.bulkGet(builtInFoodUuids)
  const favoriteByUuid = new Map(
    existingBuiltInFoods.flatMap(f => (f ? [[f.uuid, f.isFavorite]] : []))
  )
  const mergedFoods = BUILT_IN_FOODS.map(f => ({
    ...f,
    isFavorite: favoriteByUuid.get(f.uuid) ?? f.isFavorite,
  }))
  await db.foods.bulkPut(mergedFoods)

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
