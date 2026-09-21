import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Wrapper for routes shown without the bottom nav (keeps safe-area padding). */
export default function FullScreen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="h-dvh overflow-y-auto overscroll-contain bg-background pt-safe pl-safe pr-safe">
      <div className={cn('mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]', className)}>
        {children}
      </div>
    </div>
  )
}
