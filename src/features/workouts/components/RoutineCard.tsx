import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { RoutineCategory, RoutineLevel } from '@/types'
import { cn } from '@/lib/utils'
import { CATEGORY_META, LEVEL_META } from '../categories'
import RoutineArt from './RoutineArt'

interface Props {
  to: string
  name: string
  category: RoutineCategory
  level: RoutineLevel
  minutes: number
  /** Extra line under the chips, e.g. scheduled days. */
  footer?: ReactNode
  className?: string
}

export default function RoutineCard({ to, name, category, level, minutes, footer, className }: Props) {
  const cat = CATEGORY_META[category]
  const lvl = LEVEL_META[level]
  return (
    <Link
      to={to}
      className={cn(
        'relative block min-h-[148px] overflow-hidden rounded-3xl bg-card p-5 transition-transform active:scale-[0.99]',
        className,
      )}
    >
      <RoutineArt category={category} />
      <div className="relative flex h-full flex-col gap-3">
        <Badge variant="tag" className="w-fit gap-1.5">
          <cat.Icon size={13} />
          {cat.label}
        </Badge>
        <div className="mt-auto">
          <h3 className="text-lg font-semibold leading-tight">{name}</h3>
          <div className="mt-2 flex items-center gap-4 text-sm text-foreground/85">
            <span className="flex items-center gap-1.5">
              <lvl.Icon size={16} className="text-foreground/70" />
              {lvl.label}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={15} className="text-foreground/70" />
              {minutes} min
            </span>
          </div>
          {footer && <div className="mt-2 text-xs text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </Link>
  )
}
