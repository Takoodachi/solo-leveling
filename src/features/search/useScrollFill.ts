import { useEffect, type RefObject } from 'react'

/** How far the page goes up under a strip before its fill is whole: about the strip's padding under its field. */
const FILL_PX = 12

/** The first element after `el` that is drawn: what the page brings up under it. */
function nextShown(el: Element): Element | null {
  for (let next = el.nextElementSibling; next; next = next.nextElementSibling) {
    if (next.getClientRects().length > 0) return next
  }
  return null
}

/**
 * The fill of a `position: sticky` strip (Home's and Settings' search), in step with the page:
 * none while nothing is under it, then as much as the page has gone up under it, whole FILL_PX
 * later. It's written to `--fill` on the strip (0 to 1), which its background layer takes as its
 * opacity, on every frame the page moves, so it keeps pace with a scroll of any speed.
 *
 * It used to be a 0.3 s fade, started when an observer said the strip had reached the top: on a
 * slow scroll the observer spoke while the strip was still a fraction of a pixel short of it and
 * never again, so the fill never came, and a fast scroll back up outran the fade. Two boxes read
 * per frame cost little, since scrolling leaves the layout as it was.
 */
export function useScrollFill(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0
    const update = () => {
      frame = 0
      const under = nextShown(el)
      const past = under ? el.getBoundingClientRect().bottom - under.getBoundingClientRect().top : 0
      el.style.setProperty('--fill', String(Math.min(1, Math.max(0, past / FILL_PX))))
    }
    const schedule = () => {
      frame ||= requestAnimationFrame(update)
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [ref])
}
