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
  const at = options.findIndex(o => o.value === value)
  return (
    <div role="tablist" className={cn('relative flex rounded-full bg-card p-1', className)}>
      {/* The pill slides to the chosen option (they are all one width) */}
      {at >= 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 rounded-full bg-foreground shadow-sm transition-transform duration-200 ease-out"
          style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${at * 100}%)` }}
        />
      )}
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
              'relative min-w-0 flex-1 rounded-full font-semibold transition-colors duration-200',
              size === 'md' ? 'h-11 text-[15px]' : 'h-9 px-3 text-xs',
              active ? 'text-background' : 'text-foreground/80 hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
