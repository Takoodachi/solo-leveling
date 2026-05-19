import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { clampPercent } from '@/lib/format'

interface Props {
  label: string
  value: number
  target: number
  unit?: string
  colorClass?: string
}

export default function MacroBar({ label, value, target, unit = 'g', colorClass }: Props) {
  const percent = clampPercent(value, target)
  const over = target > 0 && value > target

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className={cn('font-medium', colorClass)}>{label}</span>
        <span className="text-muted-foreground">
          {Math.round(value)}{unit} / {target}{unit}
        </span>
      </div>
      <Progress
        value={percent}
        className={cn('h-2', over && '[&>div]:bg-destructive')}
      />
    </div>
  )
}
