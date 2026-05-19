import { useState } from 'react'
import { Search, Star } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useFoods } from '../hooks/useFoods'
import CustomFoodForm from './CustomFoodForm'
import type { Food, MealType } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  date: string
  mealType: MealType
}

export default function AddFoodDialog({ open, onClose, date, mealType }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [servings, setServings] = useState('1')
  const [showCustom, setShowCustom] = useState(false)
  const { searchFoods, addFoodLog, toggleFavorite } = useFoods()

  const results = searchFoods(query)

  async function handleAdd() {
    if (!selected) return
    const sv = Math.max(0.1, Number(servings) || 1)
    await addFoodLog({ date, foodId: selected.uuid, servings: sv, mealType })
    handleClose()
  }

  function handleClose() {
    setQuery('')
    setSelected(null)
    setServings('1')
    setShowCustom(false)
    onClose()
  }

  if (showCustom) {
    return (
      <Dialog open={open} onOpenChange={open => !open && handleClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Food</DialogTitle>
          </DialogHeader>
          <CustomFoodForm
            onSuccess={() => setShowCustom(false)}
            onCancel={() => setShowCustom(false)}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Add Food — {mealType}</DialogTitle>
        </DialogHeader>

        {selected ? (
          <div className="px-4 pb-4 flex flex-col gap-4">
            <div className="rounded-md bg-muted p-3">
              <p className="font-medium text-sm">{selected.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selected.kcalPerServing} kcal · P {selected.protein}g · C {selected.carbs}g · F {selected.fat}g
              </p>
              <p className="text-xs text-muted-foreground">per {selected.servingSize}{selected.servingUnit}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Servings</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0.1"
                step="0.5"
                value={servings}
                onChange={e => setServings(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Back</Button>
              <Button className="flex-1" onClick={handleAdd}>Add</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 pb-2 relative">
              <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search foods…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
            <ScrollArea className="h-[320px]">
              <div className="px-2 pb-4">
                {results.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No foods found</p>
                )}
                {results.map(food => (
                  <button
                    key={food.uuid}
                    onClick={() => setSelected(food)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-md transition-colors',
                      'hover:bg-accent flex items-center justify-between gap-2'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {food.kcalPerServing} kcal / {food.servingSize}{food.servingUnit}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); void toggleFavorite(food.uuid) }}
                      className="shrink-0 p-1"
                      aria-label={food.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        size={14}
                        className={food.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}
                      />
                    </button>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <div className="px-4 pb-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setShowCustom(true)}
              >
                + Create custom food
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
