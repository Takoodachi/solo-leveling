import { useState } from 'react'
import type { RankUp } from './computeRanks'
import { ceremonyQueue } from './rankUpCeremony'

/** The workout whose rank-up sequence has played, so a reload or a step back doesn't play it again. */
const SEEN_KEY = 'solo:rankUpSeen'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function seen(workoutId: string): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === workoutId
  } catch {
    return false
  }
}

/**
 * The rank-up scenes to open a just-finished workout's summary with (null = none): played once
 * per workout, and not at all when the device asks for reduced motion (the summary still lists them).
 */
export function useRankUpIntro(workoutId: string | undefined, ups: RankUp[] | undefined): { intro: RankUp[] | null; endIntro: () => void } {
  const [intro, setIntro] = useState<RankUp[] | null>(() => {
    if (!workoutId || !ups?.length || reducedMotion() || seen(workoutId)) return null
    return ceremonyQueue(ups)
  })

  function endIntro() {
    try {
      if (workoutId) sessionStorage.setItem(SEEN_KEY, workoutId)
    } catch {
      // private mode: it may play again after a reload
    }
    setIntro(null)
  }

  return { intro, endIntro }
}
