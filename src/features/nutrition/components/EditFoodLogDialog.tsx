import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { FoodLogWithFood } from '@/types'
import { amountDraft, servingsOf } from '../foodAmount'
import { MEAL_LABELS, updateFoodLogServings } from '../logFoods'
import FoodAmountFields from './FoodAmountFields'

interface Props {
  /** The logged food being corrected, or null when closed. */
  entry: FoodLogWithFood | null
  onClose: () => void
}

function AmountForm({ entry, onClose }: { entry: FoodLogWithFood; onClose: () => void }) {
  const [draft, setDraft] = useState(() => amountDraft(entry.food, entry.servings))
  // Nothing is written until the amount is actually changed (grams round, servings may not)
  const [changed, setChanged] = useState(false)

  async function save() {
    await updateFoodLogServings(entry.uuid, servingsOf(entry.food, draft))
    onClose()
  }

  return (
    // min-w-0: the dialog is a grid, and a grid item is otherwise as wide as its widest field wants
    <div className="flex min-w-0 flex-col gap-4">
      <div className="rounded-md bg-muted p-3">
        <p className="text-sm font-medium">{entry.food.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">per {entry.food.servingSize}{entry.food.servingUnit}</p>
      </div>
      <FoodAmountFields
        food={entry.food}
        draft={draft}
        onChange={next => {
          setDraft(next)
          if (next.grams !== draft.grams || next.servings !== draft.servings) setChanged(true)
        }}
      />
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" disabled={!changed} onClick={() => void save()}>Save</Button>
      </div>
    </div>
  )
}

/** Change how much of a logged food was eaten, without removing it and adding it again. */
export default function EditFoodLogDialog({ entry, onClose }: Props) {
  return (
    <Dialog open={!!entry} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change amount</DialogTitle>
          <DialogDescription>{entry ? MEAL_LABELS[entry.mealType] : ''}</DialogDescription>
        </DialogHeader>
        {entry && <AmountForm key={entry.uuid} entry={entry} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
