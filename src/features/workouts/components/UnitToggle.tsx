import type { WeightUnit } from '@/types'
import { cn } from '@/lib/utils'
import { isLb, otherUnit } from '../units'

/** The weight column's heading, which is also the switch between logging the exercise in kg and in lb. */
export default function UnitToggle({ unit, onChange }: { unit: WeightUnit | undefined; onChange: (unit: WeightUnit) => void }) {
  const lb = isLb(unit)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={lb}
      aria-label="Log in pounds"
      onClick={() => onChange(otherUnit(unit))}
      // The pill is small, so its tap target reaches into the free space above it
      className="relative mx-auto flex items-center rounded-full bg-secondary p-0.5 after:absolute after:-inset-x-1.5 after:-bottom-1 after:-top-5"
    >
      {(['kg', 'lb'] as const).map(u => (
        <span
          key={u}
          className={cn('flex h-4 items-center rounded-full px-1.5 transition-colors', (u === 'lb') === lb ? 'bg-foreground text-background' : 'text-muted-foreground')}
        >
          {u}
        </span>
      ))}
    </button>
  )
}
