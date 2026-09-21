import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type { Exercise } from '@/types'

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
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
