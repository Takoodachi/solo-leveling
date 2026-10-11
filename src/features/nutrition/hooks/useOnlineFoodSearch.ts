import { useRef, useState } from 'react'
import { searchProducts, type ScannedFood } from '../openFoodFacts'

export interface OnlineSearch {
  /** What was searched for (`onlineKey` of the text). */
  key: string
  status: 'loading' | 'done' | 'error'
  /** Still loading, but waiting its turn: the service takes one search every few seconds. */
  waiting?: boolean
  results: ScannedFood[]
}

/** Two spellings of the same search are one search. */
export const onlineKey = (query: string) => query.trim().toLowerCase().replace(/\s+/g, ' ')
/** Shorter than this isn't worth a request. */
export const MIN_ONLINE_QUERY = 2

// Open Food Facts allows about ten searches a minute, so a search already answered isn't made again
const cache = new Map<string, ScannedFood[]>()

/**
 * Search Open Food Facts by name, only when asked to (a tap, never while typing: the service is
 * shared and rate-limited). The answer is for the text it was asked with; compare `key` with
 * what's in the field now before showing it.
 */
export function useOnlineFoodSearch() {
  const [state, setState] = useState<OnlineSearch | null>(null)
  const run = useRef(0)

  async function search(query: string): Promise<void> {
    const key = onlineKey(query)
    if (key.length < MIN_ONLINE_QUERY) return
    const id = ++run.current
    const known = cache.get(key)
    if (known) {
      setState({ key, status: 'done', results: known })
      return
    }
    setState({ key, status: 'loading', results: [] })
    try {
      const results = await searchProducts(key, () => {
        if (run.current === id) setState({ key, status: 'loading', waiting: true, results: [] })
      })
      cache.set(key, results)
      if (run.current === id) setState({ key, status: 'done', results })
    } catch {
      if (run.current === id) setState({ key, status: 'error', results: [] })
    }
  }

  function clear() {
    run.current++
    setState(null)
  }

  return { state, search, clear }
}
