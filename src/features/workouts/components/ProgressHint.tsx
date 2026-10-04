import { Plus, RotateCcw, TrendingUp, type LucideIcon } from 'lucide-react'
import type { ProgressHint as Hint } from '../progression'

const ICON: Record<Hint['kind'], LucideIcon> = { weight: TrendingUp, reps: Plus, ease: RotateCcw, reset: RotateCcw }

interface Props {
  hint: Hint
  /** Fills the hint's numbers into the sets not done yet; left out when they're already there. */
  onUse?: () => void
}

/** What to try today on this lift, from last time's numbers (see progression.ts). */
export default function ProgressHint({ hint, onUse }: Props) {
  const Icon = ICON[hint.kind]
  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-primary/10 px-3 py-2">
      <Icon size={16} className="shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{hint.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint.why}</p>
      </div>
      {onUse && (
        <button type="button" onClick={onUse} className="h-9 shrink-0 rounded-full bg-secondary px-3 text-xs font-semibold hover:bg-accent">
          Use
        </button>
      )}
    </div>
  )
}
