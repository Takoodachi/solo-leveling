import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

// A screen's slide in (AppShell: 200 ms), and a frame to spare
const SLIDE_MS = 230
let seenKey: string | null = null
let seenAt = 0

/** How long ago the navigation that put up this screen happened: the first to ask about a new one starts its clock. */
function sinceNavigation(key: string): number {
  if (key !== seenKey) {
    seenKey = key
    seenAt = performance.now()
  }
  return performance.now() - seenAt
}

/**
 * False until the screen's slide in has finished, if it's sliding in now (a tab switch inside a
 * screen isn't a navigation, so it's ready at once). Analytics draws its radar and charts after
 * that: drawing them in the slide's first frame is what made it stutter.
 */
export function useAfterSlide(): boolean {
  const { key } = useLocation()
  const [ready, setReady] = useState(() => sinceNavigation(key) >= SLIDE_MS)
  useEffect(() => {
    if (ready) return
    const timer = setTimeout(() => setReady(true), Math.max(0, SLIDE_MS - sinceNavigation(key)))
    return () => clearTimeout(timer)
  }, [ready, key])
  return ready
}
