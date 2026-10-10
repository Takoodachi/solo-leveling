import { useCallback, useEffect, useRef, useState } from 'react'

const PRESSES = 3
/** Presses further apart than this start the count again. */
const GAP_MS = 700

/**
 * Three presses in a row (taps, clicks, or Enter / Space / Escape) call `onTriple`: enough to be
 * deliberate, so one stray touch doesn't throw away something that only plays once. Returns the
 * count so far, for showing the presses as they land, and the handler for the surface to press.
 */
export function useTriplePress(onTriple: () => void): { count: number; press: () => void } {
  const [count, setCount] = useState(0)
  const pressed = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // The caller's function may be a new one on every render; the count must outlive that
  const latest = useRef(onTriple)
  useEffect(() => {
    latest.current = onTriple
  }, [onTriple])

  const press = useCallback(() => {
    clearTimeout(timer.current)
    pressed.current += 1
    setCount(pressed.current)
    if (pressed.current >= PRESSES) {
      latest.current()
      return
    }
    timer.current = setTimeout(() => {
      pressed.current = 0
      setCount(0)
    }, GAP_MS)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !['Enter', ' ', 'Escape'].includes(e.key)) return
      e.preventDefault()
      press()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer.current)
    }
  }, [press])

  return { count, press }
}
