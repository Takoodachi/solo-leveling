import { create } from 'zustand'

/** The achievement on show full screen (its toast was tapped), if any; `goal` = it was one of the goals. */
export const useCelebration = create<{ key: string | null; goal: boolean }>(() => ({ key: null, goal: false }))

export const celebrate = (key: string, goal = false) => useCelebration.setState({ key, goal })
export const endCelebration = () => useCelebration.setState({ key: null })
