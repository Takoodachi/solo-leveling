import { useCallback, useRef } from 'react'

// Let go past this share of the sheet's height, or flicked faster than this (px per ms), and it closes
const CLOSE_SHARE = 0.25
const CLOSE_SPEED = 0.5
// Pulled this far before it counts as a drag rather than a tap
const START_PX = 8
// The flick's speed is measured over the finger's last moments, not its last move (it slows as it lifts)
const SPEED_WINDOW_MS = 100
const SPRING = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'

/** Something scrolled between the touch and the sheet: then a pull down scrolls it back up instead. */
function scrolledUnder(target: EventTarget | null, sheet: HTMLElement): boolean {
  for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
    if (el.scrollTop > 0) return true
    if (el === sheet) return false
  }
  return false
}

/**
 * A ref for a bottom sheet that follows the finger down and closes when let go far enough or
 * fast enough, as a phone's own sheets do, and springs back otherwise. It only starts on a pull
 * downward with nothing scrolled under the finger, so a list inside still scrolls and sideways
 * moves (a slider) are left alone. A mouse drags it by its handle (`data-sheet-handle`).
 * `close` (kept stable) should run the sheet's own closing, which carries on from where the finger left it.
 */
export function useSheetDrag(enabled: boolean, close: () => void) {
  const detach = useRef<(() => void) | null>(null)

  return useCallback(
    (sheet: HTMLElement | null) => {
      detach.current?.()
      detach.current = null
      if (!sheet || !enabled) return

      let tracking = false
      let dragging = false
      let x0 = 0
      let y0 = 0
      let dy = 0
      let trail: { t: number; y: number }[] = []

      const begin = (x: number, y: number, target: EventTarget | null) => {
        const range = target instanceof HTMLInputElement && target.type === 'range'
        tracking = !range && !scrolledUnder(target, sheet)
        dragging = false
        x0 = x
        y0 = y
        dy = 0
        trail = [{ t: performance.now(), y }]
      }
      /** Follows a move; true while the sheet has the gesture (so the page shouldn't scroll). */
      const follow = (x: number, y: number): boolean => {
        if (!tracking) return false
        const down = y - y0
        if (!dragging) {
          if (down < 0 || Math.abs(x - x0) > down) {
            if (Math.abs(x - x0) > START_PX || down < -START_PX) tracking = false
            return false
          }
          if (down < START_PX) return false
          dragging = true
          sheet.style.transition = 'none'
        }
        const now = performance.now()
        trail.push({ t: now, y })
        while (trail.length > 2 && now - trail[0].t > SPEED_WINDOW_MS) trail.shift()
        dy = Math.max(0, down)
        sheet.style.transform = `translate3d(0, ${dy}px, 0)`
        return true
      }
      const finish = () => {
        tracking = false
        if (!dragging) return
        dragging = false
        const first = trail[0]
        const last = trail[trail.length - 1]
        const speed = (last.y - first.y) / Math.max(1, last.t - first.t)
        if (dy > sheet.offsetHeight * CLOSE_SHARE || speed > CLOSE_SPEED) {
          sheet.style.transition = ''
          close()
          return
        }
        sheet.style.transition = SPRING
        sheet.style.transform = ''
        sheet.addEventListener('transitionend', () => { sheet.style.transition = '' }, { once: true })
      }

      const onTouchStart = (e: TouchEvent) => begin(e.touches[0].clientX, e.touches[0].clientY, e.target)
      const onTouchMove = (e: TouchEvent) => {
        if (follow(e.touches[0].clientX, e.touches[0].clientY) && e.cancelable) e.preventDefault()
      }
      const onPointerDown = (e: PointerEvent) => {
        if (e.pointerType === 'touch' || !(e.target instanceof Element) || !e.target.closest('[data-sheet-handle]')) return
        sheet.setPointerCapture(e.pointerId)
        begin(e.clientX, e.clientY, e.target)
      }
      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerType !== 'touch' && sheet.hasPointerCapture(e.pointerId)) follow(e.clientX, e.clientY)
      }
      const onPointerUp = (e: PointerEvent) => {
        if (e.pointerType !== 'touch') finish()
      }

      sheet.addEventListener('touchstart', onTouchStart, { passive: true })
      sheet.addEventListener('touchmove', onTouchMove, { passive: false })
      // The lift is heard on the window: if what's under the finger is redrawn mid-drag, its touchend
      // never reaches the sheet, which would stay pulled down
      window.addEventListener('touchend', finish)
      window.addEventListener('touchcancel', finish)
      sheet.addEventListener('pointerdown', onPointerDown)
      sheet.addEventListener('pointermove', onPointerMove)
      sheet.addEventListener('pointerup', onPointerUp)
      detach.current = () => {
        sheet.removeEventListener('touchstart', onTouchStart)
        sheet.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', finish)
        window.removeEventListener('touchcancel', finish)
        sheet.removeEventListener('pointerdown', onPointerDown)
        sheet.removeEventListener('pointermove', onPointerMove)
        sheet.removeEventListener('pointerup', onPointerUp)
      }
    },
    [enabled, close],
  )
}
