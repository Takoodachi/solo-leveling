import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check, X, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useWorkoutStore } from '@/features/workouts/store'
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout'
import ExerciseBlock from '@/features/workouts/components/ExerciseBlock'
import ExerciseSearch from '@/features/workouts/components/ExerciseSearch'
import { useElapsedTime } from '@/hooks/useElapsedTime'
import { useRestTimer } from '@/hooks/useRestTimer'
import { db } from '@/db'
import { formatDuration } from '@/lib/format'
import type { Exercise } from '@/types'

export default function ActiveWorkoutPage() {
  const navigate = useNavigate()
  const { draft, startWorkout, addBlock, discardWorkout } = useWorkoutStore()
  const { saveWorkout } = useActiveWorkout()
  const elapsed = useElapsedTime(draft?.startedAt ?? null)
  const restTimer = useRestTimer()
  const [showExerciseSearch, setShowExerciseSearch] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const [defaultRest, setDefaultRest] = useState(90)

  // Start a new workout if no draft exists (navigated directly)
  useEffect(() => {
    if (!draft) startWorkout()
  }, [draft, startWorkout])

  // Load default rest seconds from settings
  useEffect(() => {
    db.settings.get(1).then(s => { if (s) setDefaultRest(s.defaultRestSeconds) })
  }, [])

  // Request notification permission on mount
  useEffect(() => {
    void restTimer.requestPermission()
  }, [restTimer])

  function handleExerciseSelect(exercise: Exercise) {
    addBlock(exercise)
    setShowExerciseSearch(false)
  }

  function handleSetComplete() {
    restTimer.start(defaultRest)
  }

  function handleDiscard() {
    discardWorkout()
    navigate('/workouts')
  }

  if (!draft) return null

  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Timer size={16} className="text-muted-foreground" />
          <span className="font-mono text-sm font-medium">{elapsed}</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowDiscard(true)}
          >
            <X size={16} />
          </Button>
          <Button size="sm" onClick={saveWorkout} className="gap-1.5">
            <Check size={16} />
            Finish
          </Button>
        </div>
      </div>

      {/* Rest timer banner */}
      {restTimer.isRunning && restTimer.secondsLeft !== null && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-primary font-medium">
            Rest: {formatDuration(restTimer.secondsLeft)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary"
            onClick={restTimer.stop}
          >
            Skip
          </Button>
        </div>
      )}

      {/* Exercise blocks */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {draft.blocks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
            <p className="text-muted-foreground text-sm">No exercises yet</p>
            <Button onClick={() => setShowExerciseSearch(true)} className="gap-2">
              <Plus size={16} />
              Add exercise
            </Button>
          </div>
        )}

        {draft.blocks.map((block, idx) => (
          <ExerciseBlock
            key={`${block.exercise.uuid}-${idx}`}
            block={block}
            blockIdx={idx}
            onSetComplete={handleSetComplete}
          />
        ))}
      </div>

      {/* Floating add exercise button */}
      {draft.blocks.length > 0 && (
        <div className="px-4 pb-6 pt-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowExerciseSearch(true)}
          >
            <Plus size={16} />
            Add exercise
          </Button>
        </div>
      )}

      <ExerciseSearch
        open={showExerciseSearch}
        onClose={() => setShowExerciseSearch(false)}
        onSelect={handleExerciseSelect}
      />

      {/* Discard confirmation */}
      <Dialog open={showDiscard} onOpenChange={setShowDiscard}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Discard workout?</DialogTitle>
            <DialogDescription>This workout will not be saved.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDiscard(false)}>
              Keep going
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDiscard}>
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
