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
import { useWorkoutDetail, findNewBests, deleteWorkout, describeBest, type NewBest } from '@/features/workouts/hooks/useWorkoutHistory'
import { formatKm, formatPace, INTENSITIES, intensityFromRpe } from '@/lib/cardio'
import type { FinishResult } from '@/features/workouts/hooks/useActiveWorkout'
import { findRankUps, type RankUp } from '@/features/ranks/computeRanks'
import RankUpsSection from '@/features/ranks/components/RankUpsSection'
import type { WorkoutSetWithExercise } from '@/types'

function describeSet(s: WorkoutSetWithExercise): string {
  if (s.exercise.type === 'cardio') {
    const effort = INTENSITIES.find(i => i.value === intensityFromRpe(s.rpe))?.label
    return [s.duration ? `${s.duration} min` : '', s.distanceKm ? formatKm(s.distanceKm) : '', formatPace(s.exerciseId, s) ?? '', s.rpe ? effort : '']
      .filter(Boolean).join(' · ') || '—'
  }
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
  const [computed, setComputed] = useState<{ bests: NewBest[]; rankUps: RankUp[] } | null>(null)
  const celebrate = state?.celebrate === true

  // History view: work out new bests and rank-ups on the fly (the finish flow passes them in).
  useEffect(() => {
    if (celebrate || !workout) return
    let cancelled = false
    void Promise.all([findNewBests(workout), findRankUps(workout)]).then(([bests, rankUps]) => {
      if (!cancelled) setComputed({ bests, rankUps })
    })
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

  const bests = celebrate ? state.newBests : (computed?.bests ?? [])
  // Older router state (before ranks existed) has no rankUps.
  const rankUps = celebrate ? (state.rankUps ?? []) : (computed?.rankUps ?? [])

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

      {celebrate && <RankUpsSection ups={rankUps} animate />}

      <WorkoutSummaryCard workout={workout} />

      {!celebrate && <RankUpsSection ups={rankUps} />}

      {bests.length > 0 && (
        <section className="rounded-3xl bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Trophy size={18} className="text-primary" /> New bests</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {bests.map(b => {
              const d = describeBest(b)
              return (
                <li key={`${b.exerciseId}-${b.kind ?? '1rm'}`} className="flex justify-between gap-3">
                  <span className="truncate">{b.exerciseName}</span>
                  <span className="shrink-0 text-muted-foreground">{d.label} {d.from} → <span className="font-semibold text-foreground">{d.to}</span></span>
                </li>
              )
            })}
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
