import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Plus, X, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useWorkoutStore } from '@/features/workouts/store'
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout'
import { useRestTimer, requestNotificationPermission } from '@/features/workouts/hooks/useRestTimer'
import { useWakeLock } from '@/features/workouts/hooks/useWakeLock'
import { useElapsed } from '@/features/workouts/hooks/useElapsed'
import { lastSessionSets } from '@/features/workouts/hooks/useWorkoutHistory'
import ExerciseLogCard from '@/features/workouts/components/ExerciseLogCard'
import ExercisePickerSheet from '@/features/workouts/components/ExercisePickerSheet'
import ExerciseInfoSheet from '@/features/workouts/components/ExerciseInfoSheet'
import RestBanner from '@/features/workouts/components/RestBanner'
import FinishWorkoutDialog from '@/features/workouts/components/FinishWorkoutDialog'
import { useSettings, DEFAULT_REST_SECONDS } from '@/features/settings/hooks/useSettings'
import { useRanks } from '@/features/ranks/useRanks'
import type { Exercise } from '@/types'

export default function ActiveWorkoutPage() {
  const navigate = useNavigate()
  const { draft, restored, addBlock, rename, discard, markAllFilledDone } = useWorkoutStore()
  const { finish } = useActiveWorkout()
  const { settings } = useSettings()
  const elapsed = useElapsed(draft?.startedAt ?? null)
  const rest = useRestTimer()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [info, setInfo] = useState<Exercise | null>(null)
  const ranks = useRanks()

  // Keep the screen on for the whole session.
  useWakeLock(!!draft)

  if (!restored) return null
  if (!draft) return <Navigate to="/workouts" replace />

  const defaultRest = settings?.defaultRestSeconds ?? DEFAULT_REST_SECONDS
  const allSets = draft.blocks.flatMap(b => b.sets)
  const doneSets = allSets.filter(s => s.done).length
  const elapsedMin = Math.round(elapsed.seconds / 60)
  const rankOf = new Map(ranks?.lifts.map(l => [l.exerciseId, l.rank]))
  const rankContext = ranks?.sex && ranks.bodyKg ? { sex: ranks.sex, bodyKg: ranks.bodyKg } : null

  async function handleAddExercise(exercise: Exercise) {
    const lastSets = await lastSessionSets(exercise.uuid)
    addBlock(exercise, { restSec: defaultRest, lastSets })
  }

  function handleSetDone(restSec: number) {
    requestNotificationPermission() // inside the tap, as iOS requires
    rest.start(restSec || defaultRest)
  }

  function handleDiscard() {
    rest.stop()
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
            aria-label="Discard workout"
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
              <Timer size={12} className="text-primary" />
              <span className="tabular-nums">{elapsed.label}</span>
              <span>· {doneSets}/{allSets.length} sets</span>
            </p>
          </div>
          <Button size="sm" onClick={() => setFinishOpen(true)} disabled={draft.blocks.length === 0}>
            Finish
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

        {draft.blocks.map((block, idx) => (
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
        elapsedMin={elapsedMin}
        doneSets={doneSets}
        totalSets={allSets.length}
        onMarkAllDone={markAllFilledDone}
        onFinish={async opts => {
          rest.stop()
          await finish(opts)
        }}
      />

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader className="text-left">
            <DialogTitle>Discard workout?</DialogTitle>
            <DialogDescription>Nothing from this session will be saved.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDiscardOpen(false)}>Keep going</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDiscard}>Discard</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
