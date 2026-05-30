import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getWorkoutWithSets } from '@/features/workouts/hooks/useWorkouts'
import { formatDurationMin } from '@/lib/format'
import { format, parseISO } from 'date-fns'
import type { WorkoutWithSets, WorkoutSetWithExercise } from '@/types'

interface GroupedExercise {
  exerciseId: string
  name: string
  category: string
  type: WorkoutSetWithExercise['exercise']['type']
  sets: WorkoutSetWithExercise[]
}

function groupSetsByExercise(sets: WorkoutSetWithExercise[]): GroupedExercise[] {
  const groups: GroupedExercise[] = []
  const indexByExercise = new Map<string, number>()
  for (const s of sets) {
    let idx = indexByExercise.get(s.exerciseId)
    if (idx == null) {
      idx = groups.length
      indexByExercise.set(s.exerciseId, idx)
      groups.push({
        exerciseId: s.exerciseId,
        name: s.exercise.name,
        category: s.exercise.category,
        type: s.exercise.type,
        sets: [],
      })
    }
    groups[idx].sets.push(s)
  }
  return groups
}

function describeSet(s: WorkoutSetWithExercise): string {
  if (s.exercise.type === 'cardio') {
    const parts: string[] = []
    if (s.duration != null) parts.push(`${s.duration} min`)
    if (s.distanceKm != null) parts.push(`${s.distanceKm} km`)
    return parts.length > 0 ? parts.join(' · ') : '—'
  }
  const parts: string[] = []
  if (s.weight != null) parts.push(`${s.weight} kg`)
  if (s.reps != null) parts.push(`× ${s.reps}`)
  if (s.rpe != null) parts.push(`@RPE ${s.rpe}`)
  return parts.length > 0 ? parts.join(' ') : '—'
}

export default function WorkoutDetailPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<WorkoutWithSets | null | undefined>(undefined)

  useEffect(() => {
    if (!uuid) {
      setWorkout(null)
      return
    }
    let cancelled = false
    getWorkoutWithSets(uuid).then(w => {
      if (!cancelled) setWorkout(w ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [uuid])

  if (workout === undefined) {
    return (
      <div className="w-full max-w-md mx-auto p-4 flex flex-col gap-4">
        <Header onBack={() => navigate(-1)} title="Workout" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (workout === null) {
    return (
      <div className="w-full max-w-md mx-auto p-4 flex flex-col gap-4">
        <Header onBack={() => navigate(-1)} title="Workout" />
        <p className="text-sm text-muted-foreground">Workout not found.</p>
      </div>
    )
  }

  const groups = groupSetsByExercise(workout.sets)
  const date = parseISO(workout.date)

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col gap-4">
      <Header onBack={() => navigate(-1)} title={format(date, 'EEE, MMM d')} />

      <Card>
        <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={14} />
          <span>{formatDurationMin(workout.durationMin)}</span>
          {workout.sets.length > 0 && (
            <>
              <span>·</span>
              <span>{workout.sets.length} sets</span>
              <span>·</span>
              <span>{groups.length} exercise{groups.length === 1 ? '' : 's'}</span>
            </>
          )}
        </CardContent>
      </Card>

      {workout.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Notes</p>
            <p className="text-sm whitespace-pre-line">{workout.notes}</p>
          </CardContent>
        </Card>
      )}

      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center py-2">
              No exercises were logged for this workout.
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map(group => (
          <Card key={group.exerciseId}>
            <CardContent className="p-4 flex flex-col gap-2">
              <div>
                <p className="font-medium text-sm">{group.name}</p>
                <p className="text-xs text-muted-foreground">{group.category}</p>
              </div>
              <div className="flex flex-col">
                {group.sets.map((s, i) => (
                  <div
                    key={s.uuid}
                    className="flex items-center justify-between py-1.5 border-t border-border first:border-t-0 text-sm"
                  >
                    <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
                    <span className="text-foreground">{describeSet(s)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
        <ChevronLeft size={18} />
      </Button>
      <h1 className="text-xl font-bold">{title}</h1>
    </div>
  )
}
