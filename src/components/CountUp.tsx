import { useLayoutEffect, useRef } from 'react'
import { RISE, rising } from '@/hooks/useRise'

// A new value ticks over this long, about as long as its bar slides
const CHANGE_MS = 700
// A value that turns up this soon after the number shows arrived with the page: no counting for it
const SETTLE_MS = 600
const outQuint = (t: number) => 1 - (1 - t) ** 5 // the bars' cubic-bezier(0.22, 1, 0.36, 1)
const outCubic = (t: number) => 1 - (1 - t) ** 3
const whole = (n: number) => Math.round(n).toLocaleString()

interface Props {
  value: number
  /** The bar it goes with (that bar's `useRise` id): it counts up from 0 as the bar fills. */
  rise: string
  /** Kept the same between renders (a function made in render would restart the count). */
  format?: (n: number) => string
}

/**
 * A number that counts up with its bar the first time it shows after the app is opened (the same
 * moments `useRise` fills the bar), and ticks over to a new value when one is logged. Otherwise,
 * like the bars, it is simply there. The frames write to the text node React made, so nothing
 * re-renders while it counts, and React's own text is always the final value.
 */
export default function CountUp({ value, rise, format = whole }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const mount = useRef({ at: 0, fresh: false })
  const shown = useRef<number | null>(null)

  useLayoutEffect(() => {
    const now = performance.now()
    if (shown.current === null) mount.current = { at: now, fresh: rising(`${location.pathname}:${rise}`) }
    const { at, fresh } = mount.current
    let frame = 0
    const paint = (n: number) => {
      const text = ref.current?.firstChild
      if (text) text.nodeValue = format(n)
      shown.current = n
    }
    const run = (from: number, start: number, duration: number, ease: (t: number) => number) => {
      const step = () => {
        const t = Math.min(1, Math.max(0, (performance.now() - start) / duration))
        paint(from + (value - from) * ease(t))
        if (t < 1) frame = requestAnimationFrame(step)
      }
      step()
    }

    if (fresh && now < at + RISE.delay + RISE.duration) run(0, at + RISE.delay, RISE.duration, outQuint)
    else if (shown.current === null || now - at < SETTLE_MS || matchMedia('(prefers-reduced-motion: reduce)').matches) shown.current = value
    else if (shown.current !== value) run(shown.current, now, CHANGE_MS, outCubic)
    return () => cancelAnimationFrame(frame)
  }, [value, rise, format])

  return <span ref={ref}>{format(value)}</span>
}
