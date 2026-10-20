import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useAfterSlide } from '@/hooks/useAfterSlide'

/**
 * Something heavy to draw (a chart), drawn once its screen has slid in: until then an empty box of
 * the same size (`className` gives it), so nothing moves when it arrives with a short fade.
 */
export default function AfterSlide({ className, children }: { className?: string; children: ReactNode }) {
  const ready = useAfterSlide()
  return ready ? <div className={cn('animate-fade-in', className)}>{children}</div> : <div className={className} aria-hidden="true" />
}
