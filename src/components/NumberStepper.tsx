import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'lg'

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
  size?: Size
}

const SIZE_CLASSES: Record<Size, {
  button: string
  input: string
  icon: number
}> = {
  sm: { button: 'h-9 w-9',  input: 'h-9 text-sm',  icon: 14 },
  lg: { button: 'h-12 w-12', input: 'h-12 text-lg font-semibold', icon: 18 },
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
  size = 'sm',
}: Props) {
  const sz = SIZE_CLASSES[size]

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
        className={cn(
          sz.button,
          'flex-shrink-0 rounded bg-muted flex items-center justify-center hover:bg-accent transition-colors',
        )}
        aria-label="Decrease"
      >
        <Minus size={sz.icon} />
      </button>
      <input
        type="number"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          'flex-1 text-center bg-background border border-input rounded-md',
          sz.input,
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          inputClassName,
        )}
      />
      <button
        type="button"
        onClick={() => adjust(step)}
        className={cn(
          sz.button,
          'flex-shrink-0 rounded bg-muted flex items-center justify-center hover:bg-accent transition-colors',
        )}
        aria-label="Increase"
      >
        <Plus size={sz.icon} />
      </button>
    </div>
  )
}
