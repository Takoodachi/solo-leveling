import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Pulse the accent around an element so it's clear what a link landed on. */
function flash(el: HTMLElement) {
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
  if (!primary || typeof el.animate !== 'function') return
  el.animate(
    [
      { boxShadow: `0 0 0 2px hsl(${primary} / 0.9)`, borderRadius: '24px' },
      { boxShadow: `0 0 0 2px hsl(${primary} / 0)`, borderRadius: '24px' },
    ],
    { duration: 1600, easing: 'ease-out' },
  )
}

/**
 * After navigating to a URL with a #section (search results do this), scroll
 * that section into view. Pages fill in from IndexedDB after they mount, so it
 * waits for the element and corrects once if the layout moved it.
 */
export function useHashScroll(): void {
  const { pathname, hash, key } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    let timer: ReturnType<typeof setTimeout> | undefined
    let tries = 0

    const settle = (el: HTMLElement) => {
      // Content above may still have been loading; nudge it back to the top once.
      timer = setTimeout(() => {
        const offset = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
        if (Math.abs(el.getBoundingClientRect().top - offset) > 24) el.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }, 600)
    }
    const attempt = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ block: 'start', behavior: 'smooth' })
        flash(el)
        settle(el)
      } else if (++tries < 25) {
        timer = setTimeout(attempt, 100)
      }
    }
    timer = setTimeout(attempt, 200)
    return () => clearTimeout(timer)
  }, [pathname, hash, key])
}
