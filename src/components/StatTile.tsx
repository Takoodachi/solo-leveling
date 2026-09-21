import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  Icon: LucideIcon
  value: string
  label?: string
  className?: string
}

/** Square-ish tile: icon on top, value below (routine detail / summary). */
export default function StatTile({ Icon, value, label, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 rounded-2xl bg-card px-2 py-4 text-center', className)}>
      <Icon size={26} strokeWidth={1.6} className="text-foreground/90" />
      <div>
        <p className="text-sm font-semibold leading-tight">{value}</p>
        {label && <p className="text-[11px] text-muted-foreground">{label}</p>}
      </div>
    </div>
  )
}
