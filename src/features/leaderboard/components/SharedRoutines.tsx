import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Collapse from '@/components/Collapse'
import { cn } from '@/lib/utils'
import { CATEGORY_META, WEEKDAY_SHORT, WEEK_ORDER } from '@/features/workouts/categories'
import { useExerciseMap, useRoutineMinutes } from '@/features/workouts/hooks/useExercises'
import { addSharedRoutine, adoptWeek } from '../sharedRoutines'
import type { SharedRoutine } from '../types'

interface Props {
  routines: SharedRoutine[]
  /** The friend's name; your own (self) routines are shown without the buttons. */
  name: string
  self: boolean
  /** Opened from the start (the routine a shared link points at). */
  initialOpen?: string | null
}

const dayList = (days: number[]) => WEEK_ORDER.filter(d => days.includes(d)).map(d => WEEKDAY_SHORT[d]).join(' · ')

/** A friend's routines: what's in each, a tap to make one yours, or their whole week. */
export default function SharedRoutines({ routines, name, self, initialOpen = null }: Props) {
  const navigate = useNavigate()
  const exerciseMap = useExerciseMap()
  const minutesFor = useRoutineMinutes()
  const [open, setOpen] = useState<string | null>(initialOpen)
  // Their routine's id → your copy's, for the ones added on this visit
  const [copies, setCopies] = useState<Record<string, string>>({})
  const [asking, setAsking] = useState(false)
  const planned = routines.filter(r => r.days.length > 0)

  async function add(r: SharedRoutine) {
    const id = await addSharedRoutine(r)
    setCopies(c => ({ ...c, [r.id]: id }))
    toast.success(`Added “${r.name}” to your routines`, { action: { label: 'Open', onClick: () => navigate(`/workouts/routine/${id}`) } })
  }

  async function adopt() {
    await adoptWeek(routines)
    setAsking(false)
    toast.success(`Your week now follows ${name}’s`, { action: { label: 'Plan', onClick: () => navigate('/workouts/plan') } })
  }

  return (
    <div className="flex flex-col gap-2">
      {routines.map(r => {
        const cat = CATEGORY_META[r.category]
        const isOpen = open === r.id
        const minutes = minutesFor({ exercises: r.items.map(i => ({ exerciseId: i.id, sets: i.sets, reps: i.reps, restSec: i.rest })), estDurationMin: r.mins })
        return (
          <div key={r.id} className="rounded-2xl bg-secondary">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : r.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 rounded-2xl p-4 text-left"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <cat.Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[`${r.items.length} ${r.items.length === 1 ? 'exercise' : 'exercises'}`, `${minutes} min`, dayList(r.days)].filter(Boolean).join(' · ')}
                </span>
              </span>
              <ChevronDown size={18} className={cn('shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
            </button>
            <Collapse open={isOpen} className="px-4 pb-4">
              <ul className="flex flex-col divide-y divide-foreground/5 text-sm">
                {r.items.map((item, i) => {
                  const known = exerciseMap.get(item.id)
                  const cardio = (known?.type ?? item.ex?.type) === 'cardio'
                  return (
                    <li key={`${item.id}-${i}`} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate">{known?.name ?? item.ex?.name ?? 'Exercise'}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{cardio ? `${item.reps} min` : `${item.sets} × ${item.reps}`}</span>
                    </li>
                  )
                })}
              </ul>
              {!self && (copies[r.id] ? (
                <Button variant="secondary" className="mt-3 w-full" onClick={() => navigate(`/workouts/routine/${copies[r.id]}`)}>Added · open yours</Button>
              ) : (
                <Button className="mt-3 w-full" onClick={() => void add(r)}>Add to my routines</Button>
              ))}
            </Collapse>
          </div>
        )
      })}

      {!self && planned.length > 0 && (
        <Button variant="secondary" className="mt-1" onClick={() => setAsking(true)}>Use {name}’s week</Button>
      )}
      {self && <p className="px-1 text-xs text-muted-foreground">Friends can open these and add them to their own routines.</p>}

      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle>Use {name}’s week?</DialogTitle>
            <DialogDescription>
              {planned.map(r => `${dayList(r.days)}: ${r.name}`).join('. ')}. Their routines are added to yours, planned on those days. Your own routines all stay, just not on those days.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAsking(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => void adopt()}>Use their week</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
