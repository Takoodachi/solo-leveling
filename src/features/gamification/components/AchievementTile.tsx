import { format } from 'date-fns'
import { Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AchievementView } from '../store'

interface Props {
  achievement: AchievementView
  /** 0–1 towards it, for a locked one once it's been counted. */
  progress?: number
  isGoal?: boolean
  onOpen: () => void
}

/** One achievement in a grid: its icon and name, the date it was earned or how far along it is. */
export default function AchievementTile({ achievement: a, progress, isGoal, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('relative flex min-w-0 flex-col items-center gap-1.5 rounded-3xl bg-card px-2 py-4 text-center active:scale-[0.98]', !a.unlocked && 'text-foreground/55')}
    >
      {isGoal && <Target size={14} className="absolute right-2.5 top-2.5 text-primary" aria-label="Goal" />}
      <span className={cn('text-3xl', !a.unlocked && 'opacity-45 grayscale')} aria-hidden="true">{a.icon}</span>
      <span className="text-xs font-semibold leading-tight">{a.title}</span>
      {a.unlocked ? (
        <span className="text-[10px] leading-tight text-muted-foreground">{a.unlockedAt ? format(new Date(a.unlockedAt), 'MMM d, yyyy') : 'Unlocked'}</span>
      ) : (
        <>
          <span className="text-[10px] leading-tight text-muted-foreground">{a.description}</span>
          {progress !== undefined && (
            <span className="mt-auto block h-1 w-4/5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
            </span>
          )}
        </>
      )}
    </button>
  )
}
