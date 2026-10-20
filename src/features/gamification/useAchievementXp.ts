import { useEffect } from 'react'
import { syncService } from '@/lib/sync'
import { backfillAchievementXp, evaluateAchievements } from '@/lib/achievementEval'
import { announceAchievements } from './announce'

/**
 * Mount once (App), after the first sync (a device just signed in must first hear what another
 * already did): pays the XP for achievements earned before they gave any (once per account), then
 * unlocks any the data already earns, such as new ones added since the last launch, so they don't
 * wait for the next log. In that order, so nothing is paid twice.
 */
export function useAchievementXpBackfill(ready: boolean): void {
  useEffect(() => {
    if (!ready) return
    void syncService.whenIdle()
      .then(backfillAchievementXp)
      .then(evaluateAchievements)
      .then(announceAchievements)
      .catch(() => {})
  }, [ready])
}
