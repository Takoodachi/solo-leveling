import { ChevronRight, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDurationMin } from '@/lib/format'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Workout } from '@/types'

interface Props {
  workout: Workout
  setCount?: number
  exerciseNames?: string[]
  onClick?: () => void
}

export default function WorkoutCard({ workout, setCount = 0, exerciseNames = [], onClick }: Props) {
  const date = parseISO(workout.date)
  const interactive = !!onClick

  return (
    <Card
      className={cn(
        interactive && 'cursor-pointer hover:bg-accent/30 hover:border-primary/30 active:scale-[0.98] transition-all'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 flex items-center gap-3">
        {/* Date block */}
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider leading-none">{format(date, 'EEE')}</span>
          <span className="text-lg font-bold leading-none mt-1">{format(date, 'd')}</span>
        </div>

        {/* Summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
            <Clock size={11} />
            <span>{formatDurationMin(workout.durationMin)}</span>
            {setCount > 0 && (
              <>
                <span>·</span>
                <span>{setCount} sets</span>
              </>
            )}
          </div>
          <p className="text-sm font-medium truncate">
            {exerciseNames.length > 0
              ? exerciseNames.slice(0, 3).join(' · ') + (exerciseNames.length > 3 ? ` +${exerciseNames.length - 3}` : '')
              : 'No exercises'}
          </p>
        </div>

        {interactive && <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
      </CardContent>
    </Card>
  )
}
