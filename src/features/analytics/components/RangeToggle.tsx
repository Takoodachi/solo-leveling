import { cn } from '@/lib/utils'
import type { StrengthRange } from '../hooks/useAnalyticsData'

const OPTIONS: { value: StrengthRange; label: string }[] = [
  { value: 30,  label: '30d' },
  { value: 90,  label: '90d' },
  { value: 180, label: '180d' },
  { value: 0,   label: 'All' },
]

interface Props {
  value: StrengthRange
  onChange: (v: StrengthRange) => void
}

export default function RangeToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 p-0.5 bg-muted rounded-md w-fit">
      {OPTIONS.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-1 rounded text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
