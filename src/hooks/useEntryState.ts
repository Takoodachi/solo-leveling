import { useState } from 'react'
import { useLocation } from 'react-router-dom'

// Lives as long as the page does; one small entry per screen visit that changed something
const saved = new Map<string, unknown>()

/**
 * State that belongs to one visit of a screen (a picked month, a search): going Back to the
 * screen finds it as it was left, while opening the screen afresh starts over. It hangs on the
 * history entry's key, so nothing is written to the URL and no navigation happens.
 */
export function useEntryState<T>(name: string, initial: T): [T, (next: T) => void] {
  const id = `${name}:${useLocation().key}`
  const read = () => (saved.has(id) ? (saved.get(id) as T) : initial)
  const [state, setState] = useState(() => ({ id, value: read() }))
  // A new visit of the same screen reuses this component: its state is the other visit's
  const value = state.id === id ? state.value : read()
  const set = (next: T) => {
    saved.set(id, next)
    setState({ id, value: next })
  }
  return [value, set]
}
