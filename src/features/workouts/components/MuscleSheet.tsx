import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Exercise } from '@/types'

interface Props {
  exercise: Exercise
  open: boolean
  onClose: () => void
}

export default function MuscleSheet({ exercise, open, onClose }: Props) {
  const hasDiagram = !!exercise.wgerId
  const hasMuscles = (exercise.muscles?.length ?? 0) > 0

  return (
    <Sheet open={open} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            {exercise.name}
            <Badge variant="secondary" className="text-xs capitalize">{exercise.type}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5">
          {/* Muscle diagram images from wger.de */}
          {hasDiagram && (
            <div className="flex gap-3 justify-center">
              {(['front', 'back'] as const).map(side => (
                <div key={side} className="flex flex-col items-center gap-1">
                  <img
                    src={`https://wger.de/en/exercise/${exercise.wgerId}/muscle/${side}/image`}
                    alt={`${side} muscles for ${exercise.name}`}
                    className="h-40 w-auto object-contain"
                    loading="lazy"
                  />
                  <span className="text-[10px] text-muted-foreground capitalize">{side}</span>
                </div>
              ))}
            </div>
          )}

          {/* Muscle chip lists */}
          {hasMuscles && (
            <div className="flex flex-col gap-3">
              {(exercise.muscles?.length ?? 0) > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Primary</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.muscles!.map(m => (
                      <span
                        key={m}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium border',
                          'bg-primary/15 text-primary border-primary/30'
                        )}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(exercise.musclesSecondary?.length ?? 0) > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Secondary</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.musclesSecondary!.map(m => (
                      <span
                        key={m}
                        className="px-2.5 py-1 rounded-full text-xs font-medium border bg-muted text-muted-foreground border-border"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasMuscles && !hasDiagram && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No muscle data available for this exercise
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
