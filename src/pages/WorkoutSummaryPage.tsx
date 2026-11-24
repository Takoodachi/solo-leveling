import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Trophy, Trash2, Pencil, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import CompletionHero from '@/features/workouts/components/CompletionHero'
import WorkoutSummaryCard from '@/features/workouts/components/WorkoutSummaryCard'
import ProgressHint from '@/features/workouts/components/ProgressHint'
import { plateauHint } from '@/features/workouts/plateau'
import ShareWorkoutDialog from '@/features/workouts/components/ShareWorkoutDialog'
import { useWorkoutDetail, findNewBests, deleteWorkout, describeBest, type NewBest } from '@/features/workouts/hooks/useWorkoutHistory'
import { canEditWorkout, EDIT_WINDOW_DAYS, useEditWorkout } from '@/features/workouts/hooks/useEditWorkout'
import { useExerciseUnits } from '@/features/workouts/hooks/useExerciseNote'
import { useUnits } from '@/features/settings/units'
import { describeSet } from '@/features/workouts/describeSet'
import { useNow } from '@/hooks/useNow'
import { dropFinished } from '@/features/workouts/store'
import type { FinishResult } from '@/features/workouts/hooks/useActiveWorkout'
import { findRankUps, type RankUp } from '@/features/ranks/computeRanks'
import RankUpsSection from '@/features/ranks/components/RankUpsSection'
import RankUpCeremony from '@/features/ranks/components/RankUpCeremony'
import { useRankUpIntro } from '@/features/ranks/useRankUpIntro'
import type { WorkoutSetWithExercise } from '@/types'

function groupByExercise(sets: WorkoutSetWithExercise[]) {
  const groups: { name: string; sets: WorkoutSetWithExercise[] }[] = []
  for (const s of sets) {
    const g = groups.find(x => x.name === s.exercise.name)
    if (g) g.sets.push(s)
    else groups.push({ name: s.exercise.name, sets: [s] })
  }
  return groups
}

const NONE: never[] = []

/** A workout just finished opens with its rank-ups, full screen; the summary comes in once they've played. */
export default function WorkoutSummaryPage() {
  const { id } = useParams()
  const state = useLocation().state as FinishResult | null
  const { intro, endIntro } = useRankUpIntro(id, state?.celebrate ? state.rankUps : undefined)
  // Here from the logger: its draft goes now that this screen has taken its place
  useEffect(() => dropFinished(), [])

  return (
    <>
      <RankUpCeremony ups={intro} onDone={endIntro} cut />
      {!intro && <WorkoutSummary />}
    </>
  )
}

function WorkoutSummary() {
  const { id } = useParams()
  const navigate = useNavigate()
  const state = useLocation().state as FinishResult | null
  const workout = useWorkoutDetail(id)
  const { startEditing } = useEditWorkout()
  const now = useNow()
  const [computed, setComputed] = useState<{ bests: NewBest[]; rankUps: RankUp[] } | null>(null)
  const [replay, setReplay] = useState<RankUp | null>(null)
  const [sharing, setSharing] = useState(false)
  const unitOf = useExerciseUnits()
  const unit = useUnits(s => s.weight)
  const stillness = useReducedMotion()
  const celebrate = state?.celebrate === true
  // In the logger's place (finished, or an edit saved or called off): on screen at once, since a
  // fade from an empty page flashed white on light themes; after the rank-up sequence, the stage
  // fading away is its entrance
  const fromLogger = useNavigationType() === 'REPLACE'

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

  const editable = canEditWorkout(workout.date, now)
  // Stable empties: the share card redraws whenever these change
  const bests = celebrate ? state.newBests : (computed?.bests ?? NONE)
  // Older router state (before ranks existed) has no rankUps.
  const rankUps = celebrate ? (state.rankUps ?? NONE) : (computed?.rankUps ?? NONE)
  // Right after finishing: the lifts that plateaued with it (plateau.ts)
  const plateaus = (celebrate && state.plateaus) || NONE
  // In history, wait for the bests and rank-ups so the card has them
  const canShare = celebrate || computed !== null

  async function handleDelete() {
    if (!workout || !window.confirm('Delete this workout? This can’t be undone.')) return
    await deleteWorkout(workout.uuid)
    toast.success('Workout deleted')
    navigate('/workouts', { replace: true })
  }

  return (
    <FullScreen className="flex flex-col gap-5" enter={!fromLogger}>
      {celebrate ? (
        <CompletionHero xp={state.xp} />
      ) : (
        <PageHeader
          back="/workouts"
          eyebrow={format(parseISO(workout.date), 'EEEE, d MMMM')}
          title={workout.name ?? 'Workout'}
          action={
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full text-muted-foreground" aria-label="Share workout" disabled={!canShare} onClick={() => setSharing(true)}>
              <Share2 size={20} />
            </Button>
          }
        />
      )}

      {celebrate && <RankUpsSection ups={rankUps} animate onReplay={stillness ? undefined : setReplay} />}

      <WorkoutSummaryCard workout={workout} />

      {!celebrate && <RankUpsSection ups={rankUps} onReplay={stillness ? undefined : setReplay} />}
      <RankUpCeremony ups={replay && [replay]} onDone={() => setReplay(null)} />

      {bests.length > 0 && (
        <section className="rounded-3xl bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Trophy size={18} className="text-primary" /> New bests</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {bests.map(b => {
              const d = describeBest(b, unit)
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
        <ul className="flex flex-col divide-y divide-foreground/5">
          {groupByExercise(workout.sets).map(g => {
            const plateau = plateaus.find(p => p.exerciseId === g.sets[0].exerciseId)
            return (
              <li key={g.name} className="py-3 first:pt-0 last:pb-0">
                <p className="font-medium">{g.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{g.sets.map(s => describeSet(s, s.exercise, unitOf(s.exerciseId), true)).join('  ·  ')}</p>
                {plateau && <ProgressHint hint={plateauHint(plateau)} className="mb-0 mt-3" />}
              </li>
            )
          })}
        </ul>
        {workout.notes && <p className="mt-4 rounded-2xl bg-secondary p-3 text-sm text-foreground/85">{workout.notes}</p>}
      </section>

      <div className="flex flex-col gap-2">
        {celebrate && <Button size="lg" onClick={() => navigate('/home', { replace: true })}>Done</Button>}
        <Button variant="secondary" size="lg" className="gap-2" disabled={!canShare} onClick={() => setSharing(true)}>
          <Share2 size={16} /> Share workout
        </Button>
        {editable && (
          <Button variant={celebrate ? 'ghost' : 'secondary'} size={celebrate ? 'default' : 'lg'} className="gap-2" onClick={() => void startEditing(workout.uuid)}>
            <Pencil size={16} /> Edit workout
          </Button>
        )}
        {!celebrate && (
          <>
            <Button variant="ghost" className="gap-2 text-destructive hover:text-destructive" onClick={() => void handleDelete()}>
              <Trash2 size={16} /> Delete workout
            </Button>
            {!editable && <p className="text-center text-xs text-muted-foreground">Workouts can be edited for {EDIT_WINDOW_DAYS} days.</p>}
          </>
        )}
      </div>
      <ShareWorkoutDialog open={sharing} onOpenChange={setSharing} workout={workout} bests={bests} rankUps={rankUps} unitOf={unitOf} />
    </FullScreen>
  )
}
