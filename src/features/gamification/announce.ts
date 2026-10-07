import { toast } from 'sonner'
import { db } from '@/db'
import type { AchievementDef } from './achievements'

/** Tell the user what was just unlocked: one toast each, or one for the lot when it's a pile (an update that added many). */
export async function announceAchievements(unlocked: AchievementDef[]): Promise<void> {
  if (unlocked.length === 0) return
  if (unlocked.length > 3) {
    const names = unlocked.slice(0, 3).map(a => a.title).join(', ')
    toast.success(`${unlocked.length} achievements unlocked`, { icon: '🏅', description: `${names} and ${unlocked.length - 3} more. They’re on your Profile.` })
    return
  }
  const goals = new Set((await db.settings.get(1))?.achievementGoals ?? [])
  for (const a of unlocked) toast.success(`${goals.has(a.key) ? 'Goal reached' : 'Achievement unlocked'}: ${a.title}`, { icon: a.icon })
}
