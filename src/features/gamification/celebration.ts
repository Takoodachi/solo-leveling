import { create } from 'zustand'

/** The achievement on show full screen (its toast was tapped), if any; `goal` = it was one of the goals. */
export const useCelebration = create<{ key: string | null; goal: boolean }>(() => ({ key: null, goal: false }))

/**
 * The rank-up sequence is on screen, or about to be. Toasts and the celebration wait for it: two
 * full-screen light shows at once (a toast tapped over the sequence) glitched the screen.
 */
const useStage = create<{ on: boolean }>(() => ({ on: false }))
export const useStageOn = () => useStage(s => s.on)
let release: ReturnType<typeof setTimeout> | undefined

/** Holds toasts and celebrations, for `ms` or (without it) until held again with a time. */
export function holdStage(ms?: number): void {
  clearTimeout(release)
  useStage.setState({ on: true })
  if (ms != null) release = setTimeout(() => useStage.setState({ on: false }), ms)
}

/** Runs `show` now, or once the rank-up sequence has ended. */
export function afterStage(show: () => void): void {
  if (!useStage.getState().on) return show()
  const stop = useStage.subscribe(s => {
    if (s.on) return
    stop()
    show()
  })
}

export const celebrate = (key: string, goal = false) => afterStage(() => useCelebration.setState({ key, goal }))
export const endCelebration = () => useCelebration.setState({ key: null })
