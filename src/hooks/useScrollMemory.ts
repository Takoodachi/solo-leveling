import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Where each history entry was left scrolled, by its key, for as long as the app is open
const positions = new Map<string, number>()
// How long Back keeps reaching for the old place while the screen fills in
const RESTORE_MS = 1500

/**
 * Back (and Forward) returns a screen to where it was scrolled; going anywhere new starts at the
 * top. A screen's content turns up after it mounts (its code, then the database), so the restore
 * keeps trying until the page is tall enough, and lets go the moment the user scrolls or touches.
 * A change of search or hash on the same screen (a dialog opening by URL) leaves it where it is.
 */
export function useScrollMemory(): void {
  const { pathname, key } = useLocation()
  const navigation = useNavigationType()
  const current = useRef(key)
  const lastPath = useRef(pathname)

  useEffect(() => {
    history.scrollRestoration = 'manual'
    const save = () => positions.set(current.current, scrollY)
    addEventListener('scroll', save, { passive: true })
    return () => removeEventListener('scroll', save)
  }, [])

  useLayoutEffect(() => {
    current.current = key
    const samePage = lastPath.current === pathname
    lastPath.current = pathname
    const target = navigation === 'POP' ? positions.get(key) : undefined
    if (!target) {
      if (!samePage) window.scrollTo(0, 0)
      return
    }
    let frame = 0
    const started = performance.now()
    const stop = () => {
      cancelAnimationFrame(frame)
      removeEventListener('touchstart', stop)
      removeEventListener('wheel', stop)
    }
    const reach = () => {
      window.scrollTo(0, target)
      if (Math.abs(scrollY - target) < 2 || performance.now() - started > RESTORE_MS) stop()
      else frame = requestAnimationFrame(reach)
    }
    addEventListener('touchstart', stop, { passive: true })
    addEventListener('wheel', stop, { passive: true })
    reach()
    return stop
  }, [key, pathname, navigation])
}
