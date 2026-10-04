import { useState } from 'react'
import { StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveExerciseNote, useExerciseNote } from '../hooks/useExerciseNote'

const MAX_LENGTH = 300

/**
 * Your own note on an exercise (seat height, pin, grip), the same wherever the exercise shows.
 * Tap to write or change it; it saves when you leave the field.
 */
export default function ExerciseNote({ exerciseId, cardio, className }: { exerciseId: string; cardio?: boolean; className?: string }) {
  const note = useExerciseNote(exerciseId)
  const [draft, setDraft] = useState<string | null>(null) // null = not editing
  const examples = cardio ? 'route, incline, level' : 'seat, pin, grip'

  if (note === undefined) return null

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(note)}
        className={cn(
          'flex min-h-9 w-full items-start gap-2 rounded-2xl text-left text-sm',
          note ? 'bg-secondary px-3 py-2' : 'items-center text-muted-foreground',
          className,
        )}
      >
        <StickyNote size={14} className={cn('shrink-0 text-primary', note && 'mt-0.5')} />
        <span className="min-w-0 flex-1 whitespace-pre-line [overflow-wrap:anywhere]">{note || `Add a note (${examples}…)`}</span>
      </button>
    )
  }

  function commit() {
    void saveExerciseNote(exerciseId, draft ?? '')
    setDraft(null)
  }

  return (
    <textarea
      autoFocus
      rows={2}
      maxLength={MAX_LENGTH}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      aria-label="Exercise note"
      placeholder={`Your ${examples}, cues…`}
      className={cn('block w-full resize-none rounded-2xl bg-secondary px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary', className)}
    />
  )
}
