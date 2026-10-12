import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  id?: string
  /** Classes for the content's own box. */
  className?: string
  children: ReactNode
}

/**
 * Content that opens and closes by its height. A grid row going between 0fr and 1fr is the one
 * way to animate to "as tall as what's inside" that works in every browser (`height: auto`
 * can't be animated, and `interpolate-size` is Chrome's alone). What's inside is only mounted
 * while it shows, so a closed section costs what it did when it simply wasn't rendered.
 */
export default function Collapse({ open, id, className, children }: Props) {
  // Mounted from the moment it opens until it has finished closing
  const [mounted, setMounted] = useState(open)
  // Clipped only while it moves: once open, what's inside may reach past it (a set being carried, a focus ring)
  const [moving, setMoving] = useState(false)
  const [was, setWas] = useState(open)
  if (was !== open) {
    setWas(open)
    setMoving(true)
    if (open) setMounted(true)
  }

  return (
    <div
      id={id}
      inert={!open}
      className={cn('grid transition-[grid-template-rows,opacity] duration-300 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
      onTransitionEnd={e => {
        if (e.target !== e.currentTarget) return // one of the children's own transitions
        setMoving(false)
        if (!open) setMounted(false)
      }}
    >
      <div className={cn('min-h-0 min-w-0', (moving || !open) && 'overflow-hidden', className)}>{mounted && children}</div>
    </div>
  )
}
