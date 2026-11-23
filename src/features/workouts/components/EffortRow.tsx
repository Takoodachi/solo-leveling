import { Plus } from 'lucide-react'
import type { SetKind } from '@/types'
import { cn } from '@/lib/utils'
import { EFFORTS, type Effort } from '../effort'
import { SET_KINDS } from '../setKinds'

interface Props {
  value?: Effort
  onPick: (effort: Effort) => void
  /** After "None": a drop set, rest-pause or partials straight after it, a tap away (setKinds.ts). */
  onCarryOn?: (kind: SetKind) => void
}

/** Once an exercise's last set is ticked: how many more reps it had in it (effort.ts). Answering is up to you. */
export default function EffortRow({ value, onPick, onCarryOn }: Props) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5" role="group" aria-label="Reps left after the last set">
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
      {value === 'hard' && onCarryOn && (
        <div className="mt-2 flex gap-1.5" role="group" aria-label="Straight after it">
          {SET_KINDS.map(k => (
            <button key={k.kind} type="button" onClick={() => onCarryOn(k.kind)} className="press flex h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-secondary px-2 text-xs font-semibold">
              <Plus size={14} className="shrink-0" aria-hidden="true" /> <span className="truncate">{k.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
