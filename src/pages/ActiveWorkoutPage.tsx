import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Plus, X, Timer, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkoutStore } from '@/features/workouts/store'
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout'
import { useEditWorkout } from '@/features/workouts/hooks/useEditWorkout'
import { useRestTimer, requestNotificationPermission } from '@/features/workouts/hooks/useRestTimer'
import { useWakeLock } from '@/features/workouts/hooks/useWakeLock'
import { useElapsed } from '@/features/workouts/hooks/useElapsed'
import { lastSessionSets } from '@/features/workouts/hooks/useWorkoutHistory'
import ExerciseLogCard from '@/features/workouts/components/ExerciseLogCard'
import CardioLogCard from '@/features/workouts/components/CardioLogCard'
import { parsePositive } from '@/features/workouts/types'
import { setModeFor } from '@/lib/workoutMath'
import ExercisePickerSheet from '@/features/workouts/components/ExercisePickerSheet'
import ExerciseInfoSheet from '@/features/workouts/components/ExerciseInfoSheet'
import RestBanner from '@/features/workouts/components/RestBanner'
import FinishWorkoutDialog from '@/features/workouts/components/FinishWorkoutDialog'
import DiscardWorkoutDialog from '@/features/workouts/components/DiscardWorkoutDialog'
import { useSettings, DEFAULT_REST_SECONDS } from '@/features/settings/hooks/useSettings'
import { useRanks } from '@/features/ranks/useRanks'
import type { Exercise } from '@/types'

export default function ActiveWorkoutPage() {
  const navigate = useNavigate()
  const { draft, restored, addBlock, rename, discard, markAllFilledDone } = useWorkoutStore()
  const { finish } = useActiveWorkout()
  const { saveEdits, cancelEditing } = useEditWorkout()
  const { settings } = useSettings()
  const editing = draft?.editing
  // Editing a saved workout: no session clock, rest timer or wake lock.
  const elapsed = useElapsed(draft && !editing ? draft.startedAt : null)
  const rest = useRestTimer()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [info, setInfo] = useState<Exercise | null>(null)
  // Set before saving/cancelling an edit, which navigates on its own: the store
  // clears synchronously, before the router's (transition) navigation lands.
  const [leaving, setLeaving] = useState(false)
  const ranks = useRanks()

  // Keep the screen on for the whole session.
  useWakeLock(!!draft && !editing)

  if (!restored) return null
  if (!draft) return leaving ? null : <Navigate to="/workouts" replace />

  const defaultRest = settings?.defaultRestSeconds ?? DEFAULT_REST_SECONDS
  const allSets = draft.blocks.flatMap(b => b.sets)
  const doneSets = allSets.filter(s => s.done).length
  const elapsedMin = Math.round(elapsed.seconds / 60)
  // A run logged after the fact can be longer than the session timer: default the duration to at least that.
  const cardioMin = Math.round(draft.blocks
    .filter(b => setModeFor(b.exercise) === 'cardio')
    .flatMap(b => b.sets.filter(s => s.done))
    .reduce((sum, s) => sum + (parsePositive(s.duration) ?? 0), 0))
  const rankOf = new Map(ranks?.lifts.map(l => [l.exerciseId, l.rank]))
  const rankContext = ranks?.sex && ranks.bodyKg ? { sex: ranks.sex, bodyKg: ranks.bodyKg } : null

  async function handleAddExercise(exercise: Exercise) {
    const lastSets = await lastSessionSets(exercise.uuid)
    addBlock(exercise, { restSec: defaultRest, lastSets })
  }

  function handleSetDone(restSec: number) {
    if (editing) return
    requestNotificationPermission() // inside the tap, as iOS requires
    rest.start(restSec || defaultRest)
  }

  function handleDiscard() {
    rest.stop()
    if (editing) {
      setLeaving(true)
      cancelEditing()
      return
    }
    discard()
    navigate('/workouts', { replace: true })
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-background pl-safe pr-safe">
      {/* Header (its own safe-area padding keeps it clear of the status bar while stuck) */}
      <div className="sticky top-0 z-30 border-b border-white/5 bg-background/90 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setDiscardOpen(true)}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label={editing ? 'Discard changes' : 'Discard workout'}
          >
            <X size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <input
              value={draft.name}
              onChange={e => rename(e.target.value)}
              className="w-full truncate bg-transparent font-heading text-lg font-bold outline-none"
              aria-label="Workout name"
            />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {editing ? (
                <>
                  <Pencil size={12} className="text-primary" />
                  <span>Editing · {format(parseISO(editing.date), 'EEE d MMM')}</span>
                </>
              ) : (
                <>
                  <Timer size={12} className="text-primary" />
                  <span className="tabular-nums">{elapsed.label}</span>
                </>
              )}
              <span>· {doneSets}/{allSets.length} sets</span>
            </p>
          </div>
          <Button size="sm" onClick={() => setFinishOpen(true)} disabled={draft.blocks.length === 0}>
            {editing ? 'Save' : 'Finish'}
          </Button>
        </div>
      </div>

      <div className="mx-auto flex max-w-md flex-col gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+8rem)] pt-4">
        {draft.blocks.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-card px-6 py-12 text-center">
            <p className="font-semibold">Empty workout</p>
            <p className="text-sm text-muted-foreground">Add your first exercise to start logging sets.</p>
          </div>
        )}

        {draft.blocks.map((block, idx) => setModeFor(block.exercise) === 'cardio' ? (
          <CardioLogCard
            key={`${block.exercise.uuid}-${idx}`}
            block={block}
            blockIdx={idx}
            isFirst={idx === 0}
            isLast={idx === draft.blocks.length - 1}
            onShowInfo={() => setInfo(block.exercise)}
            bodyKg={ranks?.bodyKg ?? undefined}
            runRank={ranks?.running?.rank}
            sex={ranks?.status === 'ready' ? ranks.sex ?? undefined : undefined}
          />
        ) : (
          <ExerciseLogCard
            key={`${block.exercise.uuid}-${idx}`}
            block={block}
            blockIdx={idx}
            isFirst={idx === 0}
            isLast={idx === draft.blocks.length - 1}
            onSetDone={handleSetDone}
            onShowInfo={() => setInfo(block.exercise)}
            liftRank={rankOf.get(block.exercise.uuid)}
            rankContext={rankContext}
          />
        ))}

        <Button variant="secondary" size="lg" className="gap-2" onClick={() => setPickerOpen(true)}>
          <Plus size={18} />
          Add exercise
        </Button>
      </div>

      <RestBanner
        secondsLeft={rest.secondsLeft}
        totalSeconds={rest.totalSeconds}
        onAdjust={rest.addSeconds}
        onSkip={rest.stop}
      />

      <ExercisePickerSheet open={pickerOpen} onOpenChange={setPickerOpen} onSelect={e => void handleAddExercise(e)} />
      <ExerciseInfoSheet exercise={info} onClose={() => setInfo(null)} />

      <FinishWorkoutDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        elapsedMin={editing ? editing.durationMin : Math.max(elapsedMin, cardioMin)}
        doneSets={doneSets}
        totalSets={allSets.length}
        onMarkAllDone={markAllFilledDone}
        editing={editing && { avgHeartRate: editing.avgHeartRate, notes: draft.notes }}
        onFinish={async opts => {
          rest.stop()
          if (!editing) return finish(opts)
          setLeaving(true)
          await saveEdits(opts)
        }}
      />

      <DiscardWorkoutDialog open={discardOpen} onOpenChange={setDiscardOpen} editing={!!editing} onDiscard={handleDiscard} />
    </div>
  )
}
