import { PlayCircle } from 'lucide-react'
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
  const hasInstructions = !!exercise.instructions
  const youtubeHref = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${exercise.name} how to perform`,
  )}`

  return (
    <Sheet open={open} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
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

          {/* How to perform */}
          {hasInstructions && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How to perform</p>
              <p className="text-sm leading-relaxed text-foreground/90">{exercise.instructions}</p>
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

          {!hasMuscles && !hasDiagram && !hasInstructions && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No reference data available for this exercise
            </p>
          )}

          {/* YouTube demo */}
          <a
            href={youtubeHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <PlayCircle size={16} /> Watch demo on YouTube
          </a>
        </div>
      </SheetContent>
    </Sheet>
  )
}
