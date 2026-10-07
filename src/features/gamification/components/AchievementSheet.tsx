import { format } from 'date-fns'
import { Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { progressLabel } from '../achievements'
import { MAX_ACHIEVEMENT_GOALS } from '../goals'
import type { AchievementView } from '../store'

interface Props {
  open: boolean
  /** Stays set while the sheet closes, so it doesn't empty on the way down. */
  achievement: AchievementView | null
  value: number | undefined
  isGoal: boolean
  onToggleGoal: () => void
  onClose: () => void
}

/** One achievement up close: what it takes, how far along it is, and the button that makes it a goal. */
export default function AchievementSheet({ open, achievement: a, value, isGoal, onToggleGoal, onClose }: Props) {
  const pct = a && value !== undefined ? Math.min(1, value / a.target) : 0
  return (
    <Sheet open={open && !!a} onOpenChange={next => { if (!next) onClose() }}>
      <SheetContent side="bottom" className="px-4">
        {a && (
          <>
            <SheetHeader className="items-center text-center">
              <span className={a.unlocked ? 'text-6xl' : 'text-6xl opacity-60 grayscale'} aria-hidden="true">{a.icon}</span>
              <SheetTitle className="text-xl">{a.title}</SheetTitle>
              <SheetDescription>{a.description}</SheetDescription>
            </SheetHeader>
            {a.unlocked ? (
              <p className="py-5 text-center text-sm font-medium">
                Unlocked{a.unlockedAt ? ` ${format(new Date(a.unlockedAt), 'MMM d, yyyy')}` : ''} 🎉
              </p>
            ) : (
              <div className="flex flex-col gap-4 py-5">
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-center text-sm tabular-nums text-muted-foreground">{value === undefined ? ' ' : progressLabel(a, value)}</p>
                </div>
                <Button variant={isGoal ? 'secondary' : 'default'} size="lg" className="gap-2" onClick={onToggleGoal}>
                  <Target size={18} /> {isGoal ? 'Remove goal' : 'Set as goal'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Goals stay at the top of your achievements with their progress. Up to {MAX_ACHIEVEMENT_GOALS} at a time.
                </p>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
