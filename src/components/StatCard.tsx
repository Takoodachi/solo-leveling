import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  sub?: string
  Icon?: LucideIcon
  iconClassName?: string
  className?: string
}

export default function StatCard({ label, value, sub, Icon, iconClassName, className }: Props) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4 flex items-center gap-3">
        {Icon && (
          <div className={cn('p-2 rounded-lg bg-muted shrink-0', iconClassName)}>
            <Icon size={20} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-bold text-lg leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
