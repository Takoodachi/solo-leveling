import { useLiveQuery } from 'dexie-react-hooks'
import { computeRanks, type RanksSnapshot } from './computeRanks'

/** Live strength ranks; recomputes when workouts, weigh-ins or settings change. */
export function useRanks(): RanksSnapshot | undefined {
  return useLiveQuery(() => computeRanks(), [])
}
