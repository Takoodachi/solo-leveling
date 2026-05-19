import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (v: string) => void
  step?: number
  min?: number
  max?: number
  placeholder?: string
  inputMode?: 'numeric' | 'decimal'
  className?: string
  inputClassName?: string
  onBlur?: () => void
}

export default function NumberStepper({
  value,
  onChange,
  step = 1,
  min,
  max,
  placeholder = '0',
  inputMode = 'decimal',
  className,
  inputClassName,
  onBlur,
}: Props) {
  function adjust(delta: number) {
    const current = parseFloat(value) || 0
    let next = Math.round((current + delta) * 1000) / 1000
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    onChange(String(next))
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => adjust(-step)}
        className="h-9 w-9 flex-shrink-0 rounded bg-muted flex items-center justify-center hover:bg-accent transition-colors"
        aria-label="Decrease"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          'flex-1 h-9 text-center bg-background border border-input rounded-md text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          inputClassName
        )}
      />
      <button
        type="button"
        onClick={() => adjust(step)}
        className="h-9 w-9 flex-shrink-0 rounded bg-muted flex items-center justify-center hover:bg-accent transition-colors"
        aria-label="Increase"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
