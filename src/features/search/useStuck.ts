import { useSyncExternalStore, type RefObject } from 'react'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('scroll', onChange, { passive: true })
  window.addEventListener('resize', onChange)
  return () => {
    window.removeEventListener('scroll', onChange)
    window.removeEventListener('resize', onChange)
  }
}

/**
 * Whether a `position: sticky` element has reached its `top` and is holding there, with the page
 * scrolling under it. Until then it's just part of the page, and needs no bar of its own.
 */
export function useStuck(ref: RefObject<HTMLElement | null>): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      const el = ref.current
      if (!el) return false
      return el.getBoundingClientRect().top <= (parseFloat(getComputedStyle(el).top) || 0) + 0.5
    },
    () => false,
  )
}
