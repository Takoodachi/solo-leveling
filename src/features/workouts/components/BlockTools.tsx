import { ArrowLeftRight } from 'lucide-react'
import ExerciseNote from './ExerciseNote'

interface Props {
  exerciseId: string
  cardio?: boolean
  /** Swap this exercise for another, in the same place. Left off where that makes no sense (editing a past workout). */
  onReplace?: () => void
}

/** Under a logger card's header: your note on the exercise, and the way to swap the exercise out. */
export default function BlockTools({ exerciseId, cardio, onReplace }: Props) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <ExerciseNote exerciseId={exerciseId} cardio={cardio} brief={!!onReplace} className="min-w-0 flex-1" />
      {onReplace && (
        <button
          type="button"
          onClick={onReplace}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-semibold text-foreground/80 hover:bg-accent"
        >
          <ArrowLeftRight size={14} /> Replace
        </button>
      )}
    </div>
  )
}
