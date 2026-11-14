import { cn } from '@/lib/utils'
import { EFFORTS, type Effort } from '../effort'

interface Props {
  value?: Effort
  onPick: (effort: Effort) => void
}

/** Once an exercise's last set is ticked: how many more reps it had in it (effort.ts). Answering is up to you. */
export default function EffortRow({ value, onPick }: Props) {
  return (
    <div className="mt-3 flex items-center gap-1.5" role="group" aria-label="Reps left after the last set">
      <span className="min-w-0 flex-1 text-xs text-muted-foreground">Reps left after the last set?</span>
      {EFFORTS.map(e => (
        <button
          key={e.value}
          type="button"
          aria-pressed={value === e.value}
          onClick={() => onPick(e.value)}
          className={cn(
            'h-11 min-w-[3rem] shrink-0 rounded-full px-3 text-xs font-semibold',
            value === e.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground/80 hover:bg-accent',
          )}
        >
          {e.label}
        </button>
      ))}
    </div>
  )
}
