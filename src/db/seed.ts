import { db } from './index'

/**
 * Which catalog (built-in foods and exercises) this device's database holds. A build carries
 * its catalog's fingerprint (vite.config.ts), and the catalog is written again only when the
 * two differ: writing some 575 rows before the first screen on every launch was most of the
 * wait, and skipping it lets the catalog stay out of the code a launch has to load.
 */
const CATALOG_KEY = 'solo:catalog'
const CATALOG = import.meta.env.VITE_CATALOG as string | undefined

/**
 * Have the next launch write the built-in foods again. Sync calls it when it pulls food rows:
 * a built-in that was made a favorite lives on the server too, as it was when it was saved,
 * and a pull puts that older copy over this build's.
 */
export function forgetCatalog(): void {
  try {
    localStorage.removeItem(CATALOG_KEY)
  } catch {
    // storage unavailable: nothing was remembered, so every launch writes the catalog anyway
  }
}

async function catalogIsCurrent(): Promise<boolean> {
  try {
    // The rows themselves are checked too: the browser can drop the database and keep the stamp
    // Not while developing: the fingerprint is taken when Vite starts, and the data may have been edited since
    return !import.meta.env.DEV && !!CATALOG && localStorage.getItem(CATALOG_KEY) === CATALOG && (await db.exercises.count()) > 0 && (await db.foods.count()) > 0
  } catch {
    return false
  }
}

async function seedCatalog(): Promise<void> {
  const [{ BUILT_IN_FOODS }, { BUILT_IN_EXERCISES }] = await Promise.all([import('@/data/foods'), import('@/data/exercises')])

  // Existing installs pick up catalog growth. The user's favorite flag (and its sync state) stays.
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

  try {
    if (CATALOG) localStorage.setItem(CATALOG_KEY, CATALOG)
  } catch {
    // storage unavailable: the catalog is simply written again next launch
  }
}

export async function seedDatabase(): Promise<void> {
  if (!(await catalogIsCurrent())) await seedCatalog()

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
