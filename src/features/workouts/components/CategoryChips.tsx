import { LayoutGrid } from 'lucide-react'
import type { RoutineCategory } from '@/types'
import { cn } from '@/lib/utils'
import { CATEGORIES, CATEGORY_META } from '../categories'

interface Props {
  value: RoutineCategory | null
  onChange: (value: RoutineCategory | null) => void
}

/** Horizontal icon chips ("My activity" row in the design). */
export default function CategoryChips({ value, onChange }: Props) {
  const items = [
    { key: null, label: 'All', Icon: LayoutGrid },
    ...CATEGORIES.map(c => ({ key: c, label: CATEGORY_META[c].label, Icon: CATEGORY_META[c].Icon })),
  ]
  return (
    <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
      {items.map(({ key, label, Icon }) => {
        const active = value === key
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              'flex shrink-0 items-center gap-2.5 rounded-2xl py-2 pl-2 pr-4 transition-colors',
              active ? 'bg-foreground text-background' : 'bg-card text-foreground',
            )}
          >
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', active ? 'bg-background/10' : 'bg-secondary')}>
              <Icon size={18} />
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
