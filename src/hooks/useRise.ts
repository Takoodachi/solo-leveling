import { useCallback, useState } from 'react'

// How long a name stays fresh after its first bar: cards arrive as their data does, not at once
const FRESH_MS = 1500
// How long a bar takes a new number at once instead of sliding to it (see below)
const SETTLE_MS = 600
// Away this long, and coming back counts as opening the app
const AWAY_MS = 30 * 60_000
const FROM = { width: { width: 0 }, left: { left: 0 }, arc: { strokeDasharray: '0 1' }, turn: { transform: 'rotate(0deg)' } } satisfies Record<string, Keyframe>

/** When each bar first rose since the app was opened, by name. */
const risen = new Map<string, number>()
const onScreen = new Set<() => void>()
let hiddenAt = 0

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now()
  } else if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) {
    risen.clear()
    onScreen.forEach(rise => rise())
  }
})

/** How a bar rises: shared with the numbers that count up beside it (`CountUp`). */
export const RISE = { delay: 200, duration: 1000, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }

/**
 * Whether `name` (a page's path and a bar's id) is in its first rise since the app was opened:
 * true for the moments after it first shows, then false until the app is opened again.
 */
export function rising(name: string): boolean {
  const now = Date.now()
  const first = risen.get(name) ?? now
  risen.set(name, first)
  return now - first <= FRESH_MS && !matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * A ref for a progress bar's fill: it fills up from nothing the first time it is shown after
 * the app is opened, and is simply there on every visit after that. The fill is the small
 * reward for opening the app; replayed on every tab switch it would only be in the way.
 * "Opened" is a launch, or coming back after half an hour away (a phone keeps the app in memory
 * for days, so a launch alone would be almost never): then whatever is on screen fills again.
 *
 * `id` names the bar on its page, and bars that share a name rise together. A number that
 * changes later is the element's own CSS transition, which this holds back for the bar's first
 * moments: most bars arrive empty and get their number once it has been read, and sliding up to
 * it then would be a fill on every visit after all.
 */
export function useRise(id: string, what: keyof typeof FROM = 'width') {
  // Named once, when the bar appears
  const [name] = useState(() => `${location.pathname}:${id}`)
  return useCallback(
    (el: HTMLElement | SVGElement | null) => {
      if (!el) return
      el.style.transitionProperty = 'none'
      const settled = setTimeout(() => {
        el.style.transitionProperty = ''
      }, SETTLE_MS)
      const rise = () => {
        if (rising(name)) el.animate([FROM[what], {}], { ...RISE, fill: 'backwards' })
      }
      rise()
      onScreen.add(rise)
      return () => {
        clearTimeout(settled)
        onScreen.delete(rise)
      }
    },
    [name, what],
  )
}
