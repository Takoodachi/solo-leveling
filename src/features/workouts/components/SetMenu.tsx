import { Check, CornerDownRight, Trash2 } from 'lucide-react'
import type { SetKind } from '@/types'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { SET_KINDS } from '../setKinds'

interface Props {
  /** What it's about ("Set 3", "Drop set"); null while closed. */
  title: string | null
  onClose: () => void
  /** An ordinary lift set's failure mark; left out where there's no such choice (a drop set, a hold). */
  failure?: boolean
  onFailure?: () => void
  /** What carried it on straight after (lifts only). */
  onAdd?: (kind: SetKind) => void
  /** Left out for an exercise's only set. */
  onRemove?: () => void
}

/** A set's options, from a tap on its number: taken to failure, a drop set, rest-pause or partials after it, or out (setKinds.ts). */
export default function SetMenu({ title, onClose, failure, onFailure, onAdd, onRemove }: Props) {
  const then = (fn: () => void) => () => {
    fn()
    onClose()
  }
  return (
    <Sheet open={title != null} onOpenChange={open => { if (!open) onClose() }}>
      <SheetContent side="bottom" className="px-5">
        <SheetHeader className="mb-3 text-left">
          <SheetTitle className="text-xl">{title}</SheetTitle>
          <SheetDescription>{onAdd ? 'How it went, and what came straight after it.' : 'This set’s options.'}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 pb-2">
          {onFailure && (
            <button
              type="button"
              aria-pressed={failure}
              onClick={then(onFailure)}
              className={cn('press flex h-14 items-center gap-3 rounded-2xl px-4 text-left', failure ? 'bg-primary/15' : 'bg-secondary')}
            >
              <span className={cn('flex size-7 items-center justify-center rounded-lg text-xs font-bold', failure ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground')}>F</span>
              <span className="flex-1 font-medium">Taken to failure</span>
              {failure && <Check size={18} className="text-primary" aria-hidden="true" />}
            </button>
          )}
          {onAdd && SET_KINDS.map(k => (
            <button key={k.kind} type="button" onClick={then(() => onAdd(k.kind))} className="press flex h-14 items-center gap-3 rounded-2xl bg-secondary px-4 text-left">
              <CornerDownRight size={18} className="shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Add {k.label.toLowerCase()}</span>
                <span className="block text-xs text-muted-foreground">{k.hint}</span>
              </span>
            </button>
          ))}
          {onRemove && (
            <button type="button" onClick={then(onRemove)} className="press flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-destructive">
              <Trash2 size={16} aria-hidden="true" /> Remove
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
