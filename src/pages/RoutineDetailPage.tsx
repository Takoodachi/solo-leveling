import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Clock, Flame, Dumbbell, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import StatTile from '@/components/StatTile'
import { db } from '@/db'
import type { Exercise } from '@/types'
import { estimateKcal, metFor } from '@/lib/workoutMath'
import { CATEGORY_META, WEEKDAY_SHORT, WEEK_ORDER } from '@/features/workouts/categories'
import { useRoutineOrTemplate, copyTemplate } from '@/features/workouts/hooks/useRoutines'
import { useExerciseMap, useRoutineMinutes } from '@/features/workouts/hooks/useExercises'
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout'
import RoutineArt from '@/features/workouts/components/RoutineArt'
import RoutineExerciseCard from '@/features/workouts/components/RoutineExerciseCard'
import ExerciseInfoSheet from '@/features/workouts/components/ExerciseInfoSheet'
import { useGoBack } from '@/hooks/useGoBack'

export default function RoutineDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const goBack = useGoBack('/workouts')
  const data = useRoutineOrTemplate(id)
  const exerciseMap = useExerciseMap()
  const minutesFor = useRoutineMinutes()
  const latestWeight = useLiveQuery(() => db.bodyMetrics.orderBy('date').last(), [])
  const { startFromRoutine } = useActiveWorkout()
  const [info, setInfo] = useState<Exercise | null>(null)

  if (data === undefined) return null
  if (data === null) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">This routine doesn’t exist anymore.</p>
        <Button onClick={() => navigate('/workouts', { replace: true })}>Back to workouts</Button>
      </div>
    )
  }

  const { routine, kind } = data
  const cat = CATEGORY_META[routine.category]
  const minutes = minutesFor(routine)
  const kcal = estimateKcal(metFor(routine.category), latestWeight?.weightKg, minutes)

  async function saveTemplate() {
    const newId = await copyTemplate(data!.routine)
    toast.success('Saved to your routines')
    navigate(`/workouts/routine/${newId}`, { replace: true })
  }

  return (
    <div className="h-dvh overflow-y-auto overscroll-contain bg-background">
      {/* Hero */}
      <div className="relative h-72 pt-safe">
        <RoutineArt category={routine.category} fade="bottom" />
        <div className="relative mx-auto flex max-w-md items-center justify-between px-2 pt-2">
          <button
            type="button"
            onClick={goBack}
            className="flex h-11 items-center gap-1 rounded-full pl-2 pr-4 text-lg font-medium text-white"
          >
            <ChevronLeft size={26} /> Back
          </button>
          {kind === 'routine' && (
            <Link to={`/workouts/routine/${routine.uuid}/edit`} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur" aria-label="Edit routine">
              <Pencil size={18} />
            </Link>
          )}
        </div>
      </div>

      <div className="relative -mt-16 rounded-t-[32px] bg-background">
        <div className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Badge variant="tag" className="gap-1.5 bg-primary/90 text-white"><cat.Icon size={13} />{cat.label}</Badge>
            <h1 className="text-balance text-3xl font-bold">{routine.name}</h1>
            {routine.notes && <p className="text-balance text-muted-foreground">{routine.notes}</p>}
            {routine.scheduleDays.length > 0 && (
              <p className="eyebrow text-primary">
                {WEEK_ORDER.filter(d => routine.scheduleDays.includes(d)).map(d => WEEKDAY_SHORT[d]).join(' · ')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <StatTile Icon={Clock} value={`${minutes}-${minutes + 5} Min`} />
            <StatTile Icon={Flame} value={`~${kcal} Kcal`} />
            <StatTile Icon={Dumbbell} value={`${routine.exercises.length} Exercises`} />
          </div>

          <div className="flex flex-col gap-3">
            {routine.exercises.map((item, i) => (
              <RoutineExerciseCard
                key={`${item.exerciseId}-${i}`}
                index={i}
                item={item}
                exercise={exerciseMap.get(item.exerciseId)}
                onOpen={() => setInfo(exerciseMap.get(item.exerciseId) ?? null)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sticky actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6">
        <div className="mx-auto flex max-w-md gap-2">
          {kind === 'template' && (
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => void saveTemplate()}>Save to mine</Button>
          )}
          <Button size="lg" className="flex-1" onClick={() => void startFromRoutine(routine, kind === 'template')} disabled={routine.exercises.length === 0}>
            Start Workout
          </Button>
        </div>
      </div>

      <ExerciseInfoSheet exercise={info} onClose={() => setInfo(null)} />
    </div>
  )
}
