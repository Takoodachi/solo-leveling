import { useState } from 'react'
import { Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import NumberStepper from '@/components/NumberStepper'
import { useFoods } from '../hooks/useFoods'
import type { Food, FoodIngredient } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (ingredient: FoodIngredient) => void
  excludeUuid?: string
}

export default function IngredientPicker({ open, onClose, onSelect, excludeUuid }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState('100')
  const { searchFoods } = useFoods()

  const results = searchFoods(query).filter(f => f.uuid !== excludeUuid)

  function handleClose() {
    setQuery('')
    setSelected(null)
    setGrams('100')
    onClose()
  }

  function handleAdd() {
    if (!selected) return
    const g = parseFloat(grams)
    if (!(g > 0)) return
    onSelect({ foodUuid: selected.uuid, grams: g })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Add Ingredient</DialogTitle>
        </DialogHeader>

        {selected ? (
          <div className="px-4 pb-4 flex flex-col gap-4">
            <div className="rounded-md bg-muted p-3">
              <p className="font-medium text-sm">{selected.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selected.kcalPerServing} cal per {selected.servingSize}{selected.servingUnit}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Amount (g)</Label>
              <NumberStepper
                value={grams}
                onChange={setGrams}
                step={10}
                min={0}
                inputMode="decimal"
                placeholder="100"
              />
              {selected.servingUnit !== 'g' && selected.servingUnit !== 'ml' && (
                <p className="text-[11px] text-amber-400/80">
                  This source is per {selected.servingUnit}, not grams. Grams will be treated as servings of the source.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Back</Button>
              <Button className="flex-1" onClick={handleAdd}>Add</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 pb-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search foods…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="px-2 pb-2">
                {results.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No foods found</p>
                )}
                {results.map(food => (
                  <button
                    key={food.uuid}
                    onClick={() => {
                      setSelected(food)
                      setGrams(String(food.servingSize))
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-md transition-colors hover:bg-accent"
                  >
                    <p className="text-sm truncate">{food.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {food.kcalPerServing} cal / {food.servingSize}{food.servingUnit}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
