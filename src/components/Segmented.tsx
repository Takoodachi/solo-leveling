import { cn } from '@/lib/utils'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}

/** Pill segmented control: dark track, white active pill. */
export default function Segmented<T extends string>({ value, options, onChange, size = 'md', className }: Props<T>) {
  return (
    <div role="tablist" className={cn('flex rounded-full bg-card p-1', className)}>
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 rounded-full font-semibold transition-colors',
              size === 'md' ? 'h-11 text-[15px]' : 'h-9 px-3 text-xs',
              active ? 'bg-foreground text-background shadow-sm' : 'text-foreground/80 hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
