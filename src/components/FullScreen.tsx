import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Wrapper for routes shown without the bottom nav (keeps safe-area padding; the document scrolls). */
export default function FullScreen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-page pt-safe pl-safe pr-safe">
      {/* A fade and nothing that moves: a transform here would unpin the fixed bars some of these screens have */}
      <div className={cn('mx-auto w-full max-w-md animate-fade-in px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]', className)}>
        {children}
      </div>
    </div>
  )
}
