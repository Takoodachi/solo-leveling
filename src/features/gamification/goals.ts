import { toast } from 'sonner'
import type { Settings } from '@/types'
import { changeSettings } from '@/features/settings/hooks/useSettings'
import { achievementDef } from './achievements'

/** A few at a time: a goal is something to work towards, not a second list of everything. */
export const MAX_ACHIEVEMENT_GOALS = 3

/** The achievements picked as goals and not earned yet, in the order they were picked. */
export function achievementGoalsFrom(settings: Settings | undefined, unlocked: ReadonlySet<string>): string[] {
  const saved = Array.isArray(settings?.achievementGoals) ? settings.achievementGoals : []
  return [...new Set(saved)].filter(key => achievementDef(key) && !unlocked.has(key)).slice(0, MAX_ACHIEVEMENT_GOALS)
}

/** Picks a locked achievement as a goal, or drops it. Earned ones fall off the saved list on the way. */
export async function toggleAchievementGoal(key: string, unlocked: ReadonlySet<string>): Promise<void> {
  let full = false
  await changeSettings(saved => {
    const goals = achievementGoalsFrom(saved, unlocked)
    if (goals.includes(key)) return { achievementGoals: goals.filter(g => g !== key) }
    if (goals.length < MAX_ACHIEVEMENT_GOALS) return { achievementGoals: [...goals, key] }
    full = true
    return null
  })
  if (full) toast(`You can chase ${MAX_ACHIEVEMENT_GOALS} at a time. Drop one first.`)
}
