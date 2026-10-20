import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// A swipe has to start this close to the left edge, and go this far right before it counts
const EDGE_PX = 24
const START_PX = 10
// Let go past this share of the screen, or flicked faster than this (px per ms), and it goes back
const BACK_SHARE = 0.35
const BACK_SPEED = 0.5
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

/** The iPhone home-screen app: Safari's own swipe back isn't there (in a Safari tab it is, and this stays out of its way). */
const iosStandalone = () => (navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * Mount once, inside the router. In the iPhone home-screen app a swipe from the left edge takes
 * the screen with the finger and goes Back when let go far or fast enough (the screen Back lands
 * on then comes in from the left), otherwise it springs back. Not while a dialog or sheet is open,
 * and not where there's nothing to go back to. Android has its own Back gesture.
 */
export function useIosSwipeBack(): void {
  const navigate = useNavigate()
  useEffect(() => {
    if (!iosStandalone()) return
    const page = document.getElementById('root')
    if (!page) return
    let x0 = 0
    let y0 = 0
    let dx = 0
    let tracking = false
    let dragging = false
    let trail: { t: number; x: number }[] = []

    const reset = () => {
      page.style.transition = ''
      page.style.transform = ''
      page.style.boxShadow = ''
      page.style.opacity = ''
    }
    // Slides the screen to `to`; going back, it stays out of sight until the screen Back lands on is drawn
    const settle = (to: string, back: boolean) => {
      page.style.transition = `transform 0.22s ${EASE}`
      page.style.transform = to
      setTimeout(() => {
        if (!back) return reset()
        page.style.opacity = '0'
        navigate(-1)
        setTimeout(reset, 80)
      }, 220)
    }

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      const canGoBack = ((history.state as { idx?: number } | null)?.idx ?? 0) > 0
      tracking = e.touches.length === 1 && t.clientX <= EDGE_PX && canGoBack && !document.querySelector('[role="dialog"]')
      dragging = false
      x0 = t.clientX
      y0 = t.clientY
      dx = 0
      trail = [{ t: performance.now(), x: t.clientX }]
    }
    const onMove = (e: TouchEvent) => {
      if (!tracking) return
      const t = e.touches[0]
      dx = Math.max(0, t.clientX - x0)
      if (!dragging) {
        if (Math.abs(t.clientY - y0) > START_PX && Math.abs(t.clientY - y0) > dx) return void (tracking = false)
        if (dx < START_PX) return
        dragging = true
        page.style.transition = 'none'
        page.style.boxShadow = '-12px 0 32px rgb(0 0 0 / 0.25)'
      }
      if (e.cancelable) e.preventDefault()
      const now = performance.now()
      trail.push({ t: now, x: t.clientX })
      while (trail.length > 2 && now - trail[0].t > 100) trail.shift()
      page.style.transform = `translate3d(${dx}px, 0, 0)`
    }
    const onEnd = () => {
      if (!dragging) return void (tracking = false)
      tracking = dragging = false
      const first = trail[0]
      const last = trail[trail.length - 1]
      const speed = (last.x - first.x) / Math.max(1, last.t - first.t)
      if (dx > innerWidth * BACK_SHARE || speed > BACK_SPEED) settle('translate3d(100%, 0, 0)', true)
      else settle('translate3d(0, 0, 0)', false)
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [navigate])
}
