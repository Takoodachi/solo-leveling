import { useEffect } from 'react'

/**
 * Tells CSS which part of the page the on-screen keyboard leaves in view: `--visible-top` and
 * `--visible-height` on <html> (index.css has the defaults, the whole page), which dialogs sit
 * inside (ui/dialog.tsx). The Android app shrinks the page itself for the keyboard, so nothing is
 * set there; iPhones and Chrome keep the page as it was and only shrink the visual viewport.
 */
export function useVisibleViewport(): void {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const style = document.documentElement.style

    const update = () => {
      // Pinch zoom shrinks the visual viewport too, and that's nothing to make room for
      const covered = Math.abs(viewport.scale - 1) < 0.01 && window.innerHeight - viewport.height > 1
      if (covered) {
        style.setProperty('--visible-top', `${viewport.offsetTop}px`)
        style.setProperty('--visible-height', `${viewport.height}px`)
      } else {
        style.removeProperty('--visible-top')
        style.removeProperty('--visible-height')
      }
    }

    update()
    viewport.addEventListener('resize', update)
    // iOS also slides the page under the keyboard to bring the field into view
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])
}
