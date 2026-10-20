import { cn } from '@/lib/utils'
import { clampPercent } from '@/lib/format'
import { useRise } from '@/hooks/useRise'

// The label and its bar in the macro's own colour, so the three read apart at a glance
const COLORS = {
  primary: ['text-primary', 'bg-primary'],
  carbs: ['text-carbs', 'bg-carbs'],
  fat: ['text-fat', 'bg-fat'],
} as const

interface Props {
  label: string
  value: number
  target: number
  unit?: string
  color: keyof typeof COLORS
}

/** One macro against its target. Past the target the bar is simply full: the numbers say by how much, with no warning colour. */
export default function MacroBar({ label, value, target, unit = 'g', color }: Props) {
  const percent = clampPercent(value, target)
  const [text, bar] = COLORS[color]
  const rise = useRise('macro')

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className={cn('font-medium', text)}>{label}</span>
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
        <div ref={rise} className={cn('h-full transition-all', bar)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
