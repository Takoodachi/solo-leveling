import { ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDisplayDate } from '@/lib/date'
import { formatDurationMin } from '@/lib/format'
import type { Workout } from '@/types'

interface Props {
  workout: Workout
  setCount?: number
  exerciseNames?: string[]
  onClick?: () => void
}

export default function WorkoutCard({ workout, setCount = 0, exerciseNames = [], onClick }: Props) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:bg-accent/30 transition-colors' : ''}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{formatDisplayDate(workout.date)}</span>
            <Badge variant="secondary" className="text-xs">{formatDurationMin(workout.durationMin)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {exerciseNames.length > 0
              ? exerciseNames.slice(0, 3).join(' · ') + (exerciseNames.length > 3 ? ` +${exerciseNames.length - 3}` : '')
              : 'No exercises'}
          </p>
          {setCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{setCount} sets</p>
          )}
        </div>
        {onClick && <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
      </CardContent>
    </Card>
  )
}
