import { useEffect, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { tap } from '@/lib/haptics'

/** How long a press rests on an item before it lifts. */
const HOLD_MS = 400
/** Moving further than this before then is a scroll or a swipe, not a hold. */
const SLOP_PX = 8
/** Carried this close to the top or bottom of the screen, the page scrolls under the item. */
const EDGE_PX = 96
const EDGE_STEP_PX = 8

/** What to spread on the part of an item that is held to move it. */
export interface HoldHandle {
  onPointerDown: (e: ReactPointerEvent) => void
  onKeyDown: (e: ReactKeyboardEvent) => void
}

interface Carry {
  from: number
  /** Where it lands if let go now. */
  to: number
  /** How far it has been carried from its own place. */
  dy: number
  /** The room it takes up: what the items it passes move over by. */
  room: number
}

// One item is carried at a time, whichever list it is in
let carrying = false

/** The click that ends a hold belongs to the hold, not to whatever was held. */
function swallowClick() {
  const swallow = (e: Event) => {
    e.stopPropagation()
    e.preventDefault()
  }
  window.addEventListener('click', swallow, { capture: true, once: true })
  setTimeout(() => window.removeEventListener('click', swallow, true), 300)
}

/** One press on an item of `list`: it lifts after HOLD_MS, follows the pointer, and lands where it's let go. */
function hold(e: ReactPointerEvent, index: number, list: HTMLElement, show: (carry: Carry | null) => void, onMove: (from: number, to: number) => void) {
  // A press on a field is for typing in it
  if (carrying || list.children.length < 2 || (e.pointerType === 'mouse' && e.button !== 0) || (e.target as Element).closest('input, textarea, select')) return
  const { pointerId, clientX: startX, clientY: startY } = e
  const items = () => [...list.children] as HTMLElement[]
  let y = startY
  let lifted = false
  let grab = 0 // where on the item the pointer holds it
  let to = index
  let frame = 0

  // Measured every time: the list may change shape while the item is in the air, and the page may scroll
  const place = () => {
    const all = items()
    const item = all[index]
    if (!item) return
    const dy = y - grab - (list.getBoundingClientRect().top + item.offsetTop)
    const centre = item.offsetTop + dy + item.offsetHeight / 2
    to = all.filter((other, i) => i !== index && other.offsetTop + other.offsetHeight / 2 < centre).length
    show({ from: index, to, dy, room: item.offsetHeight + all[1].offsetTop - all[0].offsetTop - all[0].offsetHeight })
  }

  const nearEdge = () => {
    const by = y < EDGE_PX ? -EDGE_STEP_PX : y > window.innerHeight - EDGE_PX ? EDGE_STEP_PX : 0
    if (by) {
      window.scrollBy(0, by)
      place()
    }
    frame = requestAnimationFrame(nearEdge)
  }

  const lift = () => {
    const item = items()[index]
    if (carrying || !item) return end(false)
    carrying = lifted = true
    grab = y - item.getBoundingClientRect().top
    // A field being typed in saves as it loses focus, which a list folding under the hold would skip
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    tap()
    flushSync(place) // the list may fold as the item lifts…
    place() // …so it's put back under the pointer
    frame = requestAnimationFrame(nearEdge)
  }

  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return
    y = ev.clientY
    if (lifted) place()
    else if (Math.hypot(ev.clientX - startX, y - startY) > SLOP_PX) end(false)
  }
  // Let go, it lands; taken away by the system (pointercancel), it goes back
  const up = (ev: PointerEvent) => {
    if (ev.pointerId === pointerId) end(ev.type === 'pointerup')
  }
  const noMenu = (ev: Event) => ev.preventDefault() // Android's long-press menu

  const timer = setTimeout(lift, HOLD_MS)
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
  window.addEventListener('contextmenu', noMenu)

  function end(drop: boolean) {
    clearTimeout(timer)
    cancelAnimationFrame(frame)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    window.removeEventListener('contextmenu', noMenu)
    if (!lifted) return
    carrying = false
    swallowClick()
    const landed = drop ? to : index
    flushSync(() => {
      if (landed !== index) onMove(index, landed)
      show(null)
    })
    items()[landed]?.scrollIntoView({ block: 'nearest' })
  }
}

/**
 * Hold an item of a list, then carry it up or down to another place: `onMove(from, to)` when it
 * lands somewhere else. The list is the element given `attach` as its ref (it must be `relative`), and its
 * children are the items, in order: each gets `style(index)`, and `handle(index)` goes on the
 * part that is held. `from` is the item in the air, for the list to dress it (and fold itself
 * small, if its items are tall). With a keyboard, Alt + ↑ / ↓ on the handle moves it one place.
 *
 * A hold starts as an ordinary touch, so the page still scrolls from anywhere until the item
 * lifts; from then on the touch belongs to the item.
 */
export function useHoldToMove(onMove: (from: number, to: number) => void) {
  const [list, setList] = useState<HTMLElement | null>(null)
  const [carry, setCarry] = useState<Carry | null>(null)

  // Stops the page scrolling under a carried item. iOS only lets a listener do that if it was
  // already there when the touch began, so it can't be added as the item lifts.
  useEffect(() => {
    if (!list) return
    const stay = (e: TouchEvent) => {
      if (carrying && e.cancelable) e.preventDefault()
    }
    list.addEventListener('touchmove', stay, { passive: false })
    return () => list.removeEventListener('touchmove', stay)
  }, [list])

  const show = (next: Carry | null) =>
    setCarry(now => (now && next && now.to === next.to && now.dy === next.dy && now.room === next.room ? now : next))

  function handle(index: number): HoldHandle {
    return {
      onPointerDown: e => list && hold(e, index, list, show, onMove),
      onKeyDown: e => {
        const to = index + (e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0)
        if (!e.altKey || to === index || !list || to < 0 || to >= list.children.length) return
        e.preventDefault()
        onMove(index, to)
      },
    }
  }

  function style(index: number): CSSProperties | undefined {
    if (!carry) return undefined
    if (index === carry.from) return { transform: `translateY(${carry.dy}px)`, position: 'relative', zIndex: 20 }
    const passed = carry.from < carry.to ? index > carry.from && index <= carry.to : index >= carry.to && index < carry.from
    return { transform: passed ? `translateY(${carry.from < carry.to ? -carry.room : carry.room}px)` : undefined, transition: 'transform 150ms' }
  }

  return { attach: setList, handle, style, from: carry?.from ?? null }
}
