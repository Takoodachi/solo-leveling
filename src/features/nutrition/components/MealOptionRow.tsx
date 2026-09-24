import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  subtitle: string
  onAdd: () => void
  icon?: ReactNode
  /** A sibling control (e.g. delete); a button can't sit inside the row's button. */
  action?: ReactNode
  className?: string
}

/** Something to log in one tap: a title, what's in it, and an Add pill. */
export default function MealOptionRow({ title, subtitle, onAdd, icon, action, className }: Props) {
  return (
    <div className={cn('flex items-center rounded-2xl bg-secondary/60', className)}>
      <button type="button" onClick={onAdd} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left">
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
        <span className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2.5 text-xs font-semibold text-primary">
          <Plus size={12} strokeWidth={3} /> Add
        </span>
      </button>
      {action}
    </div>
  )
}
