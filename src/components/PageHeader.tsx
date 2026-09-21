import type { ReactNode } from 'react'
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

export default function PageHeader({ title, eyebrow, back, action, className }: Props) {
  const goBack = useGoBack(typeof back === 'string' ? back : '/home')

  return (
    <header className={cn('flex items-center gap-2 pt-2 pb-1', className)}>
      {back && (
        <button
          type="button"
          onClick={goBack}
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-accent"
          aria-label="Back"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="eyebrow text-muted-foreground">{eyebrow}</p>}
        <h1 className="truncate text-2xl font-bold">{title}</h1>
      </div>
      {action}
    </header>
  )
}
