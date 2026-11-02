import { useEffect, useState } from 'react'
import { cafeteriaMenu, type CafeMeal, type CafeStation, type Hall } from '../cafeteria'

interface Loaded { key: string; stations: CafeStation[] | null; error: string | null }

/** A day's cafeteria menu for one hall and meal; `retry` asks again after an error. */
export function useCafeteriaMenu(hall: Hall, meal: CafeMeal, date: string) {
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<Loaded>({ key: '', stations: null, error: null })
  // The attempt is part of the key, so a retry shows as loading again
  const key = `${hall}/${meal}/${date}/${attempt}`

  useEffect(() => {
    let alive = true
    cafeteriaMenu(hall, meal, date)
      .then(stations => { if (alive) setLoaded({ key, stations, error: null }) })
      .catch((err: unknown) => { if (alive) setLoaded({ key, stations: null, error: err instanceof Error ? err.message : String(err) }) })
    return () => { alive = false }
  }, [hall, meal, date, key])

  const current = loaded.key === key ? loaded : null
  return { stations: current?.stations ?? null, error: current?.error ?? null, loading: !current, retry: () => setAttempt(a => a + 1) }
}
