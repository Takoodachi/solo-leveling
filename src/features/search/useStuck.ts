import { useEffect, useState, type RefObject } from 'react'

/**
 * Whether a `position: sticky` element has reached its `top` and is holding there, with the page
 * scrolling under it. Until then it's just part of the page, and needs no bar of its own.
 *
 * An observer, not a measurement on every scroll event and every render: measuring made the
 * browser lay the whole page out again each time, a third of a second of a launch on a slow phone.
 */
export function useStuck(ref: RefObject<HTMLElement | null>): boolean {
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Where it holds: its own `top`, read once
    const top = Math.round(parseFloat(getComputedStyle(el).top) || 0)
    // The line it holds at is the top of what's watched, which reaches past the screen on the
    // other sides: so only holding at that line cuts into it
    const observer = new IntersectionObserver(([entry]) => setStuck(entry.intersectionRatio < 1), {
      threshold: 1,
      rootMargin: `${-(top + 1)}px 100px 100% 100px`,
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return stuck
}
