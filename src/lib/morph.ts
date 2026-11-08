/**
 * "The card grows into its page" (November 2026, at the owner's request): a View Transition that
 * morphs an element on this screen into one on the next, and back again on Back. Both ends carry
 * `data-morph="<key>"` (a routine's card `routine-card:<id>`, its page's picture `routine-hero:<id>`).
 *
 * The transition is started here rather than through the router, because the next screen reads
 * its data after its first render: the callback waits until the destination element is in the
 * page (at most WAIT_MS, the screen holding still meanwhile) and only then lets the browser take
 * its picture. Without the View Transitions API (iOS before 18), or with reduced motion, it's a
 * plain navigation. Back reverses it only from the in-app Back and Android's Back, only on the
 * history entry it opened, and only while the element is on screen; the iPhone's swipe back and
 * the browser's own buttons stay plain.
 */

const NAME = 'morph'
const WAIT_MS = 450

interface Reverse {
  /** The destination's key (the element to shrink back) and the origin's (where it lands). */
  from: string
  to: string
  scrollY: number
}

let morphing = false
const reverses = new Map<string, Reverse>()

/** True while a morph is under way: screens mounting then skip their own slide-in. */
export const isMorphing = (): boolean => morphing

function canMorph(): boolean {
  return typeof document.startViewTransition === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** The element marked with `key` that can be seen (not in a hidden, inert copy) and isn't `not`. */
function find(key: string, not?: Element | null): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-morph="${CSS.escape(key)}"]`)) {
    if (el !== not && !el.closest('[inert]')) return el
  }
  return null
}

/** The element once it's in the page, or null after WAIT_MS. */
function appear(key: string, not: Element | null): Promise<HTMLElement | null> {
  return new Promise(resolve => {
    const now = find(key, not)
    if (now) return resolve(now)
    const done = (el: HTMLElement | null) => {
      observer.disconnect()
      clearTimeout(timer)
      resolve(el)
    }
    const observer = new MutationObserver(() => {
      const el = find(key, not)
      if (el) done(el)
    })
    const timer = setTimeout(() => done(null), WAIT_MS)
    observer.observe(document.body, { childList: true, subtree: true })
  })
}

function onScreen(el: Element): boolean {
  const r = el.getBoundingClientRect()
  return r.bottom > 0 && r.top < innerHeight
}

function run(way: 'open' | 'back', fromEl: HTMLElement, toKey: string, go: () => void, arrived: (to: HTMLElement | null) => void): void {
  fromEl.style.viewTransitionName = NAME
  morphing = true
  // index.css times the two pictures by the way it goes
  document.documentElement.dataset.morph = way
  let toEl: HTMLElement | null = null
  const transition = document.startViewTransition(async () => {
    fromEl.style.viewTransitionName = ''
    go()
    toEl = await appear(toKey, fromEl)
    arrived(toEl)
    if (toEl) toEl.style.viewTransitionName = NAME
  })
  void transition.finished.finally(() => {
    morphing = false
    delete document.documentElement.dataset.morph
    if (toEl) toEl.style.viewTransitionName = ''
  })
}

/**
 * Opens a screen with `from` (an element marked data-morph) growing into the element marked
 * `toKey` there. `go` navigates. False when it can't morph: then the caller navigates itself.
 */
export function morphOpen(from: HTMLElement, toKey: string, go: () => void): boolean {
  const fromKey = from.dataset.morph
  if (!fromKey || morphing || !canMorph()) return false
  const scrollY = window.scrollY
  run('open', from, toKey, go, () => {
    // The entry just opened (React Router keeps its key in history.state): Back from it reverses
    const entry = (window.history.state as { key?: string } | null)?.key
    if (entry) reverses.set(entry, { from: toKey, to: fromKey, scrollY })
  })
  return true
}

/** Back from the history entry `entry` (a location key), reversing the morph that opened it. False when there's none to reverse. */
export function morphBack(entry: string, go: () => void): boolean {
  const reverse = reverses.get(entry)
  if (!reverse || morphing || !canMorph()) return false
  const fromEl = find(reverse.from)
  if (!fromEl || !onScreen(fromEl)) return false
  reverses.delete(entry)
  // Where the screen behind was scrolled, before its picture is taken
  run('back', fromEl, reverse.to, go, () => window.scrollTo(0, reverse.scrollY))
  return true
}
