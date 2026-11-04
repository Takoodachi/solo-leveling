import { Search } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Exercise } from '@/types'
import ExerciseNote from './ExerciseNote'
import ExerciseHistory from './ExerciseHistory'

interface Props {
  exercise: Exercise | null
  onClose: () => void
}

export default function ExerciseInfoSheet({ exercise, onClose }: Props) {
  return (
    <Sheet open={!!exercise} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto px-5">
        {exercise && (
          <>
            <SheetHeader className="mb-3 text-left">
              <SheetTitle className="pr-8 text-xl">{exercise.name}</SheetTitle>
              <SheetDescription>{exercise.category}</SheetDescription>
            </SheetHeader>
            {(exercise.muscles?.length || exercise.musclesSecondary?.length) ? (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {exercise.muscles?.map(m => <Badge key={m} variant="tag">{m}</Badge>)}
                {exercise.musclesSecondary?.map(m => <Badge key={m} variant="secondary" className="font-medium">{m}</Badge>)}
              </div>
            ) : null}
            <p className="text-sm leading-relaxed text-foreground/85">
              {exercise.instructions ?? 'No instructions for this exercise yet.'}
            </p>
            {/* A new tab in a browser; the Android app hands any outside address to the phone's browser */}
            <Button asChild variant="secondary" className="mt-4 w-full gap-2">
              <a href={`https://www.google.com/search?q=${encodeURIComponent(`how to do ${exercise.name}`)}`} target="_blank" rel="noopener noreferrer">
                <Search size={16} /> How to do it on Google
              </a>
            </Button>
            <h4 className="mb-1.5 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your note</h4>
            <ExerciseNote key={exercise.uuid} exerciseId={exercise.uuid} cardio={exercise.type === 'cardio'} />
            <ExerciseHistory exercise={exercise} />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
