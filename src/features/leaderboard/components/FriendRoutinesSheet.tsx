import { Moon } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CATEGORY_META, WEEKDAY_SHORT, WEEK_ORDER } from '@/features/workouts/categories'
import type { SharedRoutine } from '../types'
import SharedRoutines from './SharedRoutines'

interface Props {
  open: boolean
  onClose: () => void
  routines: SharedRoutine[]
  name: string
  self: boolean
  /** The routine a shared link points at: put first and opened. */
  linked: string | null
}

/** A profile's routines and the week they make, from the button beside the Bodygraph or a shared link. */
export default function FriendRoutinesSheet({ open, onClose, routines, name, self, linked }: Props) {
  const week = WEEK_ORDER.map(d => ({ d, r: routines.find(r => r.days.includes(d)) }))
  const ordered = linked ? [...routines].sort((a, b) => Number(b.id === linked) - Number(a.id === linked)) : routines

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto px-4">
        <SheetHeader className="mb-2 text-left">
          <SheetTitle className="text-xl">{self ? 'Your routines' : `${name}’s routines`}</SheetTitle>
          <SheetDescription>{self ? 'What friends see on your profile.' : 'Open one to see what’s in it and add it to yours.'}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4">
          {linked && !routines.some(r => r.id === linked) && (
            <p className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
              The routine in that link isn’t on {self ? 'your' : `${name}’s`} profile right now.
            </p>
          )}
          {week.some(w => w.r) && (
            <section className="flex flex-col gap-2">
              <h3 className="eyebrow text-muted-foreground">{self ? 'Your week' : 'Their week'}</h3>
              <div className="overflow-hidden rounded-2xl bg-secondary">
                {week.map(({ d, r }) => {
                  const Icon = r ? CATEGORY_META[r.category].Icon : Moon
                  return (
                    <div key={d} className="flex items-center gap-3 border-b border-foreground/5 px-4 py-2.5 last:border-0">
                      <span className="w-10 text-sm font-semibold text-muted-foreground">{WEEKDAY_SHORT[d]}</span>
                      <Icon size={16} className={r ? 'text-primary' : 'text-muted-foreground'} />
                      <span className={r ? 'flex-1 truncate text-sm font-medium' : 'flex-1 text-sm text-muted-foreground'}>{r?.name ?? 'Rest'}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
          {ordered.length > 0 && <SharedRoutines routines={ordered} name={name} self={self} initialOpen={linked} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
