import { useState } from 'react'
import { Plus, X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import SetRow from './SetRow'
import MuscleSheet from './MuscleSheet'
import { useWorkoutStore } from '../store'
import type { BlockDraft, SetDraft, ExerciseSuggestion } from '../types'

interface Props {
  block: BlockDraft
  blockIdx: number
  onSetComplete: () => void
  focusMode?: boolean
}

export default function ExerciseBlock({ block, blockIdx, onSetComplete, focusMode = false }: Props) {
  const { addSet, updateSet, removeSet, removeBlock } = useWorkoutStore()
  const [showMuscles, setShowMuscles] = useState(false)

  const nameClass = focusMode ? 'font-semibold text-base' : 'font-medium text-sm'

  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowMuscles(true)}
          className="flex items-center gap-1.5 text-left min-w-0"
        >
          <div className="min-w-0">
            <p className={cn(nameClass)}>{block.exercise.name}</p>
            <p className="text-xs text-muted-foreground">{block.exercise.category}</p>
          </div>
          <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => removeBlock(blockIdx)}
          aria-label="Remove exercise"
        >
          <X size={16} />
        </Button>
      </div>

      {block.suggestion && <SuggestionHint suggestion={block.suggestion} />}

      <Separator />

      <div className="flex flex-col">
        {block.sets.map((set: SetDraft, setIdx) => (
          <SetRow
            key={set.uuid}
            set={set}
            index={setIdx}
            exerciseType={block.exercise.type}
            onChange={(field, value) => updateSet(blockIdx, setIdx, field, value)}
            onDelete={() => removeSet(blockIdx, setIdx)}
            onSetComplete={onSetComplete}
            focusMode={focusMode}
            lastSet={block.lastSessionSets?.[setIdx]}
          />
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground gap-1 h-8"
        onClick={() => addSet(blockIdx)}
      >
        <Plus size={14} />
        Add set
      </Button>

      <MuscleSheet
        exercise={block.exercise}
        open={showMuscles}
        onClose={() => setShowMuscles(false)}
      />
    </div>
  )
}

function SuggestionHint({ suggestion }: { suggestion: ExerciseSuggestion }) {
  if (suggestion.source === 'history') {
    const wt = suggestion.weight != null ? `${suggestion.weight} kg` : '—'
    const reps = suggestion.reps != null ? ` × ${suggestion.reps}` : ''
    const when = suggestion.lastDate ? ` · ${relativeDays(suggestion.lastDate)}` : ''
    return (
      <p className="text-[11px] text-muted-foreground -mt-0.5">
        Last: {wt}{reps}{when}
      </p>
    )
  }
  const wt = suggestion.weight != null ? `${suggestion.weight} kg` : '—'
  return (
    <p className="text-[11px] text-amber-400/80 -mt-0.5">
      Suggested {wt} from {suggestion.sourceExerciseName} (~70%)
    </p>
  )
}

function relativeDays(isoDate: string): string {
  const then = new Date(isoDate + 'T00:00:00').getTime()
  const diffMs = Date.now() - then
  const days = Math.floor(diffMs / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
