import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FinishOptions } from '../hooks/useActiveWorkout'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  elapsedMin: number
  doneSets: number
  totalSets: number
  onFinish: (opts: FinishOptions) => Promise<void>
  onMarkAllDone: () => void
  /** Editing a saved workout: its heart rate and notes start filled in. */
  editing?: { avgHeartRate?: number; notes: string }
}

export default function FinishWorkoutDialog({ open, onOpenChange, elapsedMin, doneSets, totalSets, onFinish, onMarkAllDone, editing }: Props) {
  const [duration, setDuration] = useState<string | null>(null)
  const [heartRate, setHeartRate] = useState(editing?.avgHeartRate ? String(editing.avgHeartRate) : '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const durationValue = duration ?? String(Math.max(1, elapsedMin))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const hr = Number(heartRate)
      await onFinish({
        durationMin: Math.max(1, Math.round(Number(durationValue) || elapsedMin || 1)),
        avgHeartRate: hr > 0 ? Math.round(hr) : undefined,
        notes,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl">{editing ? 'Save changes?' : 'Finish workout?'}</DialogTitle>
          <DialogDescription>
            {doneSets} of {totalSets} checked off.{' '}
            {editing ? 'Unchecked sets are removed. Edits don’t change XP.' : 'Only checked sets and cardio are saved.'}
          </DialogDescription>
        </DialogHeader>

        {doneSets < totalSets && (
          <Button type="button" variant="secondary" onClick={onMarkAllDone}>
            Mark everything done
          </Button>
        )}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fw-duration">Duration (min)</Label>
              <Input id="fw-duration" inputMode="numeric" value={durationValue} onChange={e => setDuration(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fw-hr">Avg heart rate</Label>
              <Input id="fw-hr" inputMode="numeric" placeholder="optional" value={heartRate} onChange={e => setHeartRate(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fw-notes">Notes</Label>
            <Input id="fw-notes" placeholder="How did it feel?" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button type="submit" size="lg" disabled={saving || doneSets === 0}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Save workout'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
