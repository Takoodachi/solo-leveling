import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Trophy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import CompletionHero from '@/features/workouts/components/CompletionHero'
import WorkoutSummaryCard from '@/features/workouts/components/WorkoutSummaryCard'
import { useWorkoutDetail, findNewBests, deleteWorkout, type NewBest } from '@/features/workouts/hooks/useWorkoutHistory'
import type { FinishResult } from '@/features/workouts/hooks/useActiveWorkout'
import type { WorkoutSetWithExercise } from '@/types'

function describeSet(s: WorkoutSetWithExercise): string {
  if (s.weight && s.reps) return `${s.weight}×${s.reps}`
  if (s.reps) return `${s.reps} reps`
  const parts = [s.duration ? `${s.duration} min` : '', s.distanceKm ? `${s.distanceKm} km` : ''].filter(Boolean)
  return parts.join(' · ') || '—'
}

function groupByExercise(sets: WorkoutSetWithExercise[]) {
  const groups: { name: string; sets: WorkoutSetWithExercise[] }[] = []
  for (const s of sets) {
    const g = groups.find(x => x.name === s.exercise.name)
    if (g) g.sets.push(s)
    else groups.push({ name: s.exercise.name, sets: [s] })
  }
  return groups
}

export default function WorkoutSummaryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const state = useLocation().state as FinishResult | null
  const workout = useWorkoutDetail(id)
  const [computedBests, setComputedBests] = useState<NewBest[] | null>(null)
  const celebrate = state?.celebrate === true

  // History view: work out new bests on the fly (the finish flow passes them in).
  useEffect(() => {
    if (celebrate || !workout) return
    let cancelled = false
    void findNewBests(workout).then(b => { if (!cancelled) setComputedBests(b) })
    return () => { cancelled = true }
  }, [celebrate, workout])

  if (workout === undefined) return <FullScreen>{null}</FullScreen>
  if (workout === null) {
    return (
      <FullScreen>
        <PageHeader title="Workout" back="/workouts" />
        <p className="py-16 text-center text-muted-foreground">This workout no longer exists.</p>
      </FullScreen>
    )
  }

  const bests = celebrate ? state.newBests : (computedBests ?? [])

  async function handleDelete() {
    if (!workout || !window.confirm('Delete this workout? This can’t be undone.')) return
    await deleteWorkout(workout.uuid)
    toast.success('Workout deleted')
    navigate('/workouts', { replace: true })
  }

  return (
    <FullScreen className="flex flex-col gap-5">
      {celebrate ? (
        <CompletionHero xp={state.xp} />
      ) : (
        <PageHeader
          back="/workouts"
          eyebrow={format(parseISO(workout.date), 'EEEE, d MMMM')}
          title={workout.name ?? 'Workout'}
        />
      )}

      <WorkoutSummaryCard workout={workout} />

      {bests.length > 0 && (
        <section className="rounded-3xl bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Trophy size={18} className="text-primary" /> New bests</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {bests.map(b => (
              <li key={b.exerciseId} className="flex justify-between gap-3">
                <span className="truncate">{b.exerciseName}</span>
                <span className="shrink-0 text-muted-foreground">est. 1RM {b.previous} → <span className="font-semibold text-foreground">{b.est1RM} kg</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl bg-card p-5">
        <h2 className="mb-3 font-semibold">Exercises</h2>
        <ul className="flex flex-col divide-y divide-white/5">
          {groupByExercise(workout.sets).map(g => (
            <li key={g.name} className="py-3 first:pt-0 last:pb-0">
              <p className="font-medium">{g.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{g.sets.map(describeSet).join('  ·  ')}</p>
            </li>
          ))}
        </ul>
        {workout.notes && <p className="mt-4 rounded-2xl bg-secondary p-3 text-sm text-foreground/85">{workout.notes}</p>}
      </section>

      <div className="flex flex-col gap-2">
        {celebrate ? (
          <Button size="lg" onClick={() => navigate('/home', { replace: true })}>Done</Button>
        ) : (
          <Button variant="ghost" className="gap-2 text-destructive hover:text-destructive" onClick={() => void handleDelete()}>
            <Trash2 size={16} /> Delete workout
          </Button>
        )}
      </div>
    </FullScreen>
  )
}
