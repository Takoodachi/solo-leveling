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
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div className={cn('h-full transition-all', over ? 'bg-destructive' : 'bg-primary')} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
