import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check, X, Timer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { suggestForExercise } from '@/features/workouts/hooks/useExerciseSuggestion'
import ExerciseBlock from '@/features/workouts/components/ExerciseBlock'
import ExerciseSearch from '@/features/workouts/components/ExerciseSearch'
import { useElapsedTime } from '@/hooks/useElapsedTime'
import { useRestTimer } from '@/hooks/useRestTimer'
import { db } from '@/db'
import { formatDuration } from '@/lib/format'
import type { Exercise } from '@/types'

export default function ActiveWorkoutPage() {
  const navigate = useNavigate()
  const { draft, startWorkout, addBlock, discardWorkout, applySuggestionToBlock } = useWorkoutStore()
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

  async function handleExerciseSelect(exercise: Exercise) {
    const currentDraft = useWorkoutStore.getState().draft
    const blockIdx = currentDraft?.blocks.length ?? 0
    addBlock(exercise)
    setShowExerciseSearch(false)
    const suggestion = await suggestForExercise(exercise)
    if (suggestion) applySuggestionToBlock(blockIdx, suggestion)
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

      {/* Floating Rest Timer Pill */}
      <AnimatePresence>
        {restTimer.isRunning && restTimer.secondsLeft !== null && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 rounded-full px-5 py-2.5 flex items-center gap-4 z-50 backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <Timer size={16} />
              <span className="font-mono font-medium tracking-wider">
                {formatDuration(restTimer.secondsLeft)}
              </span>
            </div>
            <div className="w-px h-4 bg-primary-foreground/30" />
            <button
              onClick={restTimer.stop}
              className="text-xs font-semibold uppercase tracking-wider hover:text-primary-foreground/80 transition-colors"
            >
              Skip
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
