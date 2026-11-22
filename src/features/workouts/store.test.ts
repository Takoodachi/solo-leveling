import { describe, expect, it } from 'vitest'
import { dropFinished, useWorkoutStore } from './store'

const draft = { startedAt: 1, name: 'Push', notes: '', blocks: [] }

describe('leaving the logger', () => {
  it('keeps a workout still in progress', () => {
    useWorkoutStore.setState({ draft, finished: false })
    dropFinished()
    expect(useWorkoutStore.getState().draft).toBe(draft)
  })

  it('clears a finished one, once', () => {
    useWorkoutStore.setState({ draft, finished: true })
    dropFinished()
    expect(useWorkoutStore.getState()).toMatchObject({ draft: null, finished: false })
  })
})
