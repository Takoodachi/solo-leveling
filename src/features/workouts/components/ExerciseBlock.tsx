import { useState } from 'react'
import { Plus, X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import SetRow from './SetRow'
import MuscleSheet from './MuscleSheet'
import { useWorkoutStore } from '../store'
import type { BlockDraft, SetDraft } from '../types'

interface Props {
  block: BlockDraft
  blockIdx: number
  onSetComplete: () => void
}

export default function ExerciseBlock({ block, blockIdx, onSetComplete }: Props) {
  const { addSet, updateSet, removeSet, removeBlock } = useWorkoutStore()
  const [showMuscles, setShowMuscles] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowMuscles(true)}
          className="flex items-center gap-1.5 text-left min-w-0"
        >
          <div className="min-w-0">
            <p className="font-medium text-sm">{block.exercise.name}</p>
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
