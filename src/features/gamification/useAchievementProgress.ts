import { useLiveQuery } from 'dexie-react-hooks'
import { achievementDef } from './achievements'
import { achievementStats } from './achievementStats'

/**
 * How far along these achievements are: key → the number each one counts. Follows the data
 * live. Ask only for what's on screen: the rank ones mean working the ranks out.
 */
export function useAchievementProgress(keys: string[]): Record<string, number> | undefined {
  const wanted = keys.join(',')
  return useLiveQuery(async () => {
    const stat = achievementStats()
    const progress: Record<string, number> = {}
    for (const key of wanted ? wanted.split(',') : []) {
      const def = achievementDef(key)
      if (def) progress[key] = await stat(def.metric)
    }
    return progress
  }, [wanted])
}
