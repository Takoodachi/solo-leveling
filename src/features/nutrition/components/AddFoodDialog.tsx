import { useState } from 'react'
import { Search, Star, ScanLine } from 'lucide-react'
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
import BarcodeScanner from './BarcodeScanner'
import NumberStepper from '@/components/NumberStepper'
import type { Food, MealType } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  date: string
  mealType: MealType
}

function computeMacros(food: Food, servings: number) {
  return {
    kcal: Math.round(food.kcalPerServing * servings),
    protein: Math.round(food.protein * servings * 10) / 10,
    carbs: Math.round(food.carbs * servings * 10) / 10,
    fat: Math.round(food.fat * servings * 10) / 10,
  }
}

const usesGrams = (food: Food) => food.servingUnit === 'g' || food.servingUnit === 'ml'

export default function AddFoodDialog({ open, onClose, date, mealType }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [servings, setServings] = useState('1')
  const [grams, setGrams] = useState('')
  const [inputMode, setInputMode] = useState<'servings' | 'grams'>('servings')
  const [showCustom, setShowCustom] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const { searchFoods, addFoodLog, toggleFavorite, addBarcodeFood } = useFoods()

  const results = searchFoods(query)

  function getEffectiveServings(): number {
    if (inputMode === 'grams' && selected && usesGrams(selected)) {
      const g = parseFloat(grams)
      if (g > 0 && selected.servingSize > 0) return g / selected.servingSize
    }
    return Math.max(0.1, parseFloat(servings) || 1)
  }

  const macros = selected ? computeMacros(selected, getEffectiveServings()) : null

  async function handleAdd() {
    if (!selected) return
    await addFoodLog({ date, foodId: selected.uuid, servings: getEffectiveServings(), mealType })
    handleClose()
  }

  function handleFoodSelect(food: Food) {
    setSelected(food)
    setServings('1')
    setGrams(String(food.servingSize))
    setInputMode(usesGrams(food) ? 'grams' : 'servings')
  }

  function handleClose() {
    setQuery('')
    setSelected(null)
    setServings('1')
    setGrams('')
    setInputMode('servings')
    setShowCustom(false)
    setShowScanner(false)
    onClose()
  }

  async function handleBarcodeResult(barcode: string) {
    setShowScanner(false)
    const food = await addBarcodeFood(barcode)
    if (food) {
      handleFoodSelect(food)
    }
  }

  if (showScanner) {
    return (
      <Dialog open={open} onOpenChange={open => !open && handleClose()}>
        <DialogContent className="max-w-sm p-0 gap-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <BarcodeScanner
            onResult={handleBarcodeResult}
            onCancel={() => setShowScanner(false)}
          />
        </DialogContent>
      </Dialog>
    )
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
            {/* Food info */}
            <div className="rounded-md bg-muted p-3">
              <p className="font-medium text-sm">{selected.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                per {selected.servingSize}{selected.servingUnit}
              </p>
            </div>

            {/* Amount input */}
            <div className="flex flex-col gap-2">
              {usesGrams(selected) && (
                <div className="flex gap-1 p-0.5 bg-muted rounded-md w-fit">
                  {(['grams', 'servings'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInputMode(m)}
                      className={cn(
                        'px-3 py-1 rounded text-xs font-medium transition-colors',
                        inputMode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                      )}
                    >
                      {m === 'grams' ? `${selected.servingUnit}` : 'Servings'}
                    </button>
                  ))}
                </div>
              )}

              <Label>{inputMode === 'grams' ? `Amount (${selected.servingUnit})` : 'Servings'}</Label>

              {inputMode === 'grams' ? (
                <NumberStepper
                  value={grams}
                  onChange={setGrams}
                  step={10}
                  min={0}
                  inputMode="decimal"
                  placeholder={String(selected.servingSize)}
                />
              ) : (
                <NumberStepper
                  value={servings}
                  onChange={setServings}
                  step={0.5}
                  min={0.1}
                  inputMode="decimal"
                  placeholder="1"
                />
              )}
            </div>

            {/* Live macro preview */}
            {macros && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 flex justify-between">
                <span><span className="text-foreground font-medium">{macros.kcal}</span> cal</span>
                <span>P <span className="text-foreground font-medium">{macros.protein}</span>g</span>
                <span>C <span className="text-foreground font-medium">{macros.carbs}</span>g</span>
                <span>F <span className="text-foreground font-medium">{macros.fat}</span>g</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Back</Button>
              <Button className="flex-1" onClick={handleAdd}>Add</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 pb-2 flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search foods…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowScanner(true)}
                aria-label="Scan barcode"
              >
                <ScanLine size={18} />
              </Button>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="px-2 pb-2">
                {results.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No foods found</p>
                )}
                {results.map(food => (
                  <button
                    key={food.uuid}
                    onClick={() => handleFoodSelect(food)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-md transition-colors',
                      'hover:bg-accent flex items-center justify-between gap-2'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {food.kcalPerServing} cal / {food.servingSize}{food.servingUnit}
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
