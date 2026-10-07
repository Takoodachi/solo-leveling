import { Target } from 'lucide-react'
import { progressLabel } from '../achievements'
import type { AchievementView } from '../store'

interface Props {
  achievement: AchievementView
  /** The number it counts so far; undefined while it's being read. */
  value: number | undefined
  onOpen: () => void
}

/** An achievement picked as a goal: what it takes and how far along it is. */
export default function GoalCard({ achievement: a, value, onOpen }: Props) {
  const pct = value === undefined ? 0 : Math.min(1, value / a.target)
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left active:scale-[0.99]">
      <span className="text-3xl" aria-hidden="true">{a.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <Target size={14} className="shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate font-semibold">{a.title}</span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">{a.description}</span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
          <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct * 100}%` }} />
        </span>
        <span className="mt-1 block text-xs tabular-nums text-muted-foreground">{value === undefined ? ' ' : progressLabel(a, value)}</span>
      </span>
    </button>
  )
}
