import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGoBack } from '@/hooks/useGoBack'

interface Props {
  title: ReactNode
  eyebrow?: ReactNode
  /** Show a back button. A string is the fallback route when there's no history (deep link / PWA start). */
  back?: boolean | string
  action?: ReactNode
  className?: string
}

/**
 * Whether the big title has scrolled up past the top of the screen (under the status bar). An
 * observer, not a measurement on every scroll event and render: measuring made the browser lay
 * the page out again each time.
 */
function useTucked(title: RefObject<HTMLElement | null>, bar: RefObject<HTMLElement | null>): boolean {
  const [tucked, setTucked] = useState(false)
  useEffect(() => {
    const el = title.current
    if (!el) return
    // The line the title goes under: just below the bar's top, read once (the bar is fixed there)
    const line = Math.round((bar.current?.getBoundingClientRect().top ?? 0) + 8)
    const observer = new IntersectionObserver(
      ([entry]) => setTucked(!entry.isIntersecting && entry.boundingClientRect.bottom <= line),
      { rootMargin: `${-line}px 0px 0px 0px` },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [title, bar])
  return tucked
}

/**
 * A screen's title, big at the top of the page. Once it has scrolled away, a compact bar fades in
 * at the top with the title small in its middle, and the back button and action beside it (the
 * owner's pick, November 2026). The bar is fixed and takes no room, so it changes nothing about
 * the page's layout; until then it's invisible and can't be tapped.
 */
export default function PageHeader({ title, eyebrow, back, action, className }: Props) {
  const goBack = useGoBack(typeof back === 'string' ? back : '/home')
  const titleRef = useRef<HTMLHeadingElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const tucked = useTucked(titleRef, barRef)
  const backButton = back && (
    <button
      type="button"
      onClick={goBack}
      className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-accent"
      aria-label="Back"
    >
      <ChevronLeft size={24} />
    </button>
  )

  return (
    <>
      <div
        ref={barRef}
        inert={!tucked}
        className={cn(
          'fixed inset-x-0 top-[env(safe-area-inset-top)] z-30 border-b pl-safe pr-safe transition-[opacity,background-color,border-color] duration-200 ease-out',
          tucked ? 'border-foreground/5 bg-background/90 backdrop-blur-xl' : 'pointer-events-none border-transparent opacity-0',
        )}
      >
        <div className="mx-auto grid h-11 w-full max-w-md grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-2 px-4">
          <div className="flex">{backButton}</div>
          <p className="truncate text-center text-[17px] font-semibold">{title}</p>
          <div className="flex justify-end">{action}</div>
        </div>
      </div>
      <header className={cn('flex items-center gap-2 pt-2 pb-1', className)}>
        {backButton}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="eyebrow text-muted-foreground">{eyebrow}</p>}
          <h1 ref={titleRef} className="truncate text-2xl font-bold">{title}</h1>
        </div>
        {action}
      </header>
    </>
  )
}
