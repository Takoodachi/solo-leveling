import { db } from './index'
import { BUILT_IN_FOODS } from '@/data/foods'
import { BUILT_IN_EXERCISES } from '@/data/exercises'

export async function seedDatabase(): Promise<void> {
  // Upsert built-in foods on every start so existing installs pick up catalog growth.
  // Preserve the user's favorite flag (and its sync state) on built-ins.
  const existingBuiltInFoods = await db.foods.bulkGet(BUILT_IN_FOODS.map(f => f.uuid))
  await db.foods.bulkPut(
    BUILT_IN_FOODS.map((f, i) => {
      const existing = existingBuiltInFoods[i]
      return existing
        ? { ...f, isFavorite: existing.isFavorite, updatedAt: existing.updatedAt, syncPending: existing.syncPending }
        : f
    }),
  )

  // Built-in exercises are identical on every device and never synced.
  await db.exercises.bulkPut(BUILT_IN_EXERCISES)

  // Singletons are seeded with updatedAt 0 and not pending, so the first sync on
  // a new device always adopts the server copy instead of overwriting it.
  if (!(await db.userStats.get(1))) {
    await db.userStats.add({
      id: 1,
      xp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      streakFreezes: 0,
      updatedAt: 0,
    })
  }

  if (!(await db.targets.get(1))) {
    await db.targets.add({
      id: 1,
      dailyKcal: 2000,
      dailyProtein: 150,
      dailyCarbs: 200,
      dailyFat: 65,
      updatedAt: 0,
    })
  }

  if (!(await db.settings.get(1))) {
    await db.settings.add({ id: 1, updatedAt: 0 })
  }
}

/** Wipe everything on this device (sign-out / account switch), then re-seed. */
export async function wipeLocalData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map(table => table.clear()))
  })
  await seedDatabase()
}
