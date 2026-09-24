import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/db'
import { today, formatDisplayDate } from '@/lib/date'
import { loadBody, stepBurn } from '@/lib/stepCalories'
import { logSteps } from '../hooks/useDailyActivity'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  date?: string
}

export default function LogStepsSheet({ open, onOpenChange, date }: Props) {
  const day = date ?? today()
  const entry = useLiveQuery(() => db.dailyActivity.where('date').equals(day).first(), [day])
  // Draft is keyed by the open session so reopening starts from the saved value.
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? (entry?.steps != null ? String(entry.steps) : '')
  const body = useLiveQuery(() => loadBody(day), [day])
  const steps = Math.round(Number(value))
  const burn = body?.counting && steps > 0 ? stepBurn(steps, body) : null

  async function save() {
    const n = Math.round(Number(value))
    if (!Number.isFinite(n) || n < 0) return
    await logSteps(day, n)
    toast.success(`${n.toLocaleString()} steps saved`)
    close()
  }

  function close() {
    setDraft(null)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={o => (o ? onOpenChange(true) : close())}>
      <SheetContent side="bottom" className="px-4">
        <SheetHeader className="mb-2 text-left">
          <SheetTitle className="text-xl">Steps · {formatDisplayDate(day)}</SheetTitle>
          <SheetDescription>
            {burn ? `≈ ${burn.kcal.toLocaleString()} kcal at ${burn.weightKg} kg, taken off what you ate.` : 'From your phone’s health app or watch.'}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={e => { e.preventDefault(); void save() }}
        >
          <Input
            type="number"
            inputMode="numeric"
            enterKeyHint="done"
            autoFocus
            placeholder="e.g. 8,500"
            value={value}
            onChange={e => setDraft(e.target.value)}
            className="h-14 text-center text-2xl font-semibold"
          />
          <Button type="submit" size="lg" disabled={value.trim() === ''}>
            {entry ? 'Update steps' : 'Save steps'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
