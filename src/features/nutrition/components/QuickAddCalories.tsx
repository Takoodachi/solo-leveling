import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  onAdd: (kcal: number) => Promise<void> | void
  onBack: () => void
}

/** The most one entry can be: past this it's a typo. */
const MAX_KCAL = 10_000

/** Calories on their own, for when the number is known and the food isn't (a restaurant meal, a label already thrown away). */
export default function QuickAddCalories({ onAdd, onBack }: Props) {
  const [text, setText] = useState('')
  const kcal = Math.round(Number(text))
  const valid = text.trim() !== '' && kcal > 0 && kcal <= MAX_KCAL

  return (
    <form
      className="flex flex-col gap-4 px-4 pb-4"
      onSubmit={e => {
        e.preventDefault()
        if (valid) void onAdd(kcal)
      }}
    >
      <p className="text-sm text-muted-foreground">
        Just the calories. Protein, carbs and fat aren’t counted for it, so pick a food when you want those.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quick-kcal">Calories</Label>
        <Input
          id="quick-kcal"
          inputMode="numeric"
          enterKeyHint="done"
          autoFocus
          placeholder="e.g. 350"
          value={text}
          onChange={e => setText(e.target.value.replace(/[^\d]/g, ''))}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        <Button type="submit" className="flex-1" disabled={!valid}>Add</Button>
      </div>
    </form>
  )
}
