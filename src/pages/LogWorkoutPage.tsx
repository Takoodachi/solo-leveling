import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check, X, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWorkoutStore } from '@/features/workouts/store'
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout'
import { suggestForExercise } from '@/features/workouts/hooks/useExerciseSuggestion'
import ExerciseBlock from '@/features/workouts/components/ExerciseBlock'
import ExerciseSearch from '@/features/workouts/components/ExerciseSearch'
import { today } from '@/lib/date'
import type { Exercise } from '@/types'

export default function LogWorkoutPage() {
  const navigate = useNavigate()
  const { draft, startLogWorkout, addBlock, discardWorkout, applySuggestionToBlock, setDraftDate, setDraftDuration } = useWorkoutStore()
  const { saveWorkout } = useActiveWorkout()
  const [showExerciseSearch, setShowExerciseSearch] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)

  // Initialize a backdated draft if none exists (navigated directly).
  useEffect(() => {
    if (!draft) startLogWorkout(today())
  }, [draft, startLogWorkout])

  async function handleExerciseSelect(exercise: Exercise) {
    const currentDraft = useWorkoutStore.getState().draft
    const blockIdx = currentDraft?.blocks.length ?? 0
    addBlock(exercise)
    setShowExerciseSearch(false)
    const suggestion = await suggestForExercise(exercise)
    if (suggestion) applySuggestionToBlock(blockIdx, suggestion)
  }

  function handleDiscard() {
    discardWorkout()
    navigate('/workouts')
  }

  if (!draft) return null

  const date = draft.date ?? today()
  const durationMin = draft.durationMin ?? 0
  const hasAnyFilledSet = draft.blocks.some(b =>
    b.sets.some(s => s.reps || s.weight || s.duration || s.distanceKm)
  )
  const canFinish = durationMin > 0 && hasAnyFilledSet

  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar size={16} />
          <span className="text-sm font-medium">Log past workout</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowDiscard(true)}
            aria-label="Discard"
          >
            <X size={16} />
          </Button>
          <Button size="sm" onClick={saveWorkout} className="gap-1.5" disabled={!canFinish}>
            <Check size={16} />
            Finish
          </Button>
        </div>
      </div>

      {/* Date + Duration */}
      <div className="px-4 py-3 border-b border-border flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={date}
            max={today()}
            onChange={e => setDraftDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 w-32">
          <Label className="text-xs">Duration (min)</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={durationMin || ''}
            onChange={e => {
              const v = e.target.value
              setDraftDuration(v ? Math.max(0, Number(v)) : undefined)
            }}
            placeholder="45"
          />
        </div>
      </div>

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
            onSetComplete={noop}
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
              Keep editing
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

function noop() { /* rest timer intentionally disabled for backdated entries */ }
