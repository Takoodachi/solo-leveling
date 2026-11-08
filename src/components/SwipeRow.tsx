import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { clamp } from '@/lib/utils'

/** How far it stays open on its button, and the share of the row past which letting go deletes at once. */
const OPEN = 88
const FULL = 0.5
/** Movement before a drag picks a direction: sideways is ours, up or down is the page's scroll. */
const SLOP = 8

/** The row that's open, so opening another closes it. */
let closeOpen: (() => void) | null = null

/** Slides the row to `x` (0 or less) and the red area into the room it leaves. */
function place(front: HTMLElement | null, back: HTMLElement | null, x: number, animate: boolean): void {
  const ease = animate ? '220ms cubic-bezier(0.2, 0.8, 0.2, 1)' : ''
  if (front) Object.assign(front.style, { transition: ease && `transform ${ease}`, transform: x ? `translateX(${x}px)` : '' })
  if (back) Object.assign(back.style, { transition: ease && `width ${ease}`, width: `${-x}px` })
}

interface Props {
  children: ReactNode
  onDelete: () => void
  label?: string
}

/**
 * A row that slides left under a finger to show Delete (November 2026, at the owner's request): let
 * go past half the row and it goes at once (the caller offers Undo), past half the button and it
 * stays open on it; a tap while it's open closes it, and so does a tap anywhere else. The red area
 * is exactly the room the row has left, so nothing shows behind a see-through card. Only a
 * sideways drag is taken; up and down still scroll. The row keeps its own ways to do the same
 * (a bin button), since a swipe is easy to miss.
 */
export default function SwipeRow({ children, onDelete, label = 'Delete' }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const front = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ x: number; y: number; from: number; at: number; side: boolean } | null>(null)
  const dragged = useRef(false)
  const [open, setOpen] = useState(false)

  const close = () => { place(front.current, back.current, 0, true); setOpen(false) }

  // Open: another row opening, or a tap outside this one, closes it
  useEffect(() => {
    if (!open) return
    const shut = () => { place(front.current, back.current, 0, true); setOpen(false) }
    closeOpen?.()
    closeOpen = shut
    const outside = (e: globalThis.PointerEvent) => { if (!box.current?.contains(e.target as Node)) shut() }
    document.addEventListener('pointerdown', outside, true)
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      if (closeOpen === shut) closeOpen = null
    }
  }, [open])

  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragged.current = false
    drag.current = { x: e.clientX, y: e.clientY, from: open ? -OPEN : 0, at: open ? -OPEN : 0, side: false }
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.side) {
      if (Math.abs(dx) < SLOP && Math.abs(e.clientY - d.y) < SLOP) return
      if (Math.abs(e.clientY - d.y) > Math.abs(dx)) { drag.current = null; return }
      d.side = true
      dragged.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    d.at = clamp(d.from + dx, [-(box.current?.offsetWidth ?? 320), 0])
    place(front.current, back.current, d.at, false)
  }

  function up() {
    const d = drag.current
    drag.current = null
    if (!d?.side) return
    const width = box.current?.offsetWidth ?? 320
    if (d.at < -width * FULL) {
      place(front.current, back.current, -width, true)
      setTimeout(onDelete, 180)
    } else if (d.at < -OPEN / 2) {
      place(front.current, back.current, -OPEN, true)
      setOpen(true)
    } else close()
  }

  return (
    <div
      ref={box}
      className="relative -mx-2 touch-pan-y overflow-hidden rounded-xl"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      // A drag isn't a tap on what's under it; a tap on an open row closes it (Delete still deletes)
      onClickCapture={e => {
        if (dragged.current) {
          e.preventDefault()
          e.stopPropagation()
        } else if (open && !back.current?.contains(e.target as Node)) {
          e.preventDefault()
          e.stopPropagation()
          close()
        }
        dragged.current = false
      }}
    >
      <button
        ref={back}
        type="button"
        onClick={onDelete}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        className="absolute inset-y-0 right-0 flex w-0 items-center justify-end overflow-hidden bg-destructive text-sm font-semibold text-destructive-foreground"
      >
        <span className="w-[88px] shrink-0 text-center">{label}</span>
      </button>
      <div ref={front} className="relative px-2">
        {children}
      </div>
    </div>
  )
}
