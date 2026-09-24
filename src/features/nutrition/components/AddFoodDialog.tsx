import { lazy, Suspense, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, subDays } from 'date-fns'
import { Search, ScanLine, Sparkles, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/db'
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
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/features/auth/authStore'
import { useFoods, saveScannedFood } from '../hooks/useFoods'
import { useBarcodeLookup } from '../hooks/useBarcodeLookup'
import ScannedFoodReview, { type ReviewedFood } from './ScannedFoodReview'
import CustomFoodForm from './CustomFoodForm'
import AiFoodConfirm, { type AiParsedFood } from './AiFoodConfirm'
import FoodResults, { type RecentUse } from './FoodResults'
import { useSavedMeals, type SavedMealWithSummary } from '../hooks/useMeals'
import { logMealItems, unlogFoods, amountLabel } from '../logFoods'
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

// The barcode library is large; load it only when the scanner opens.
const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

const RECENT_WINDOW_DAYS = 14
const AI_FOOD_ENABLED = import.meta.env.VITE_ENABLE_AI_FOOD === 'true'

function daysAgoIso(days: number): string {
  return format(subDays(new Date(), days), 'yyyy-MM-dd')
}

/** What's been added since the dialog opened (it stays open to add several things). */
interface Added {
  label: string
  kcal: number
  uuids: string[]
}

export default function AddFoodDialog({ open, onClose, date, mealType }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [servings, setServings] = useState('1')
  const [grams, setGrams] = useState('')
  const [inputMode, setInputMode] = useState<'servings' | 'grams'>('servings')
  const [showCustom, setShowCustom] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AiParsedFood | null>(null)
  const [added, setAdded] = useState<Added[]>([])
  const savedMeals = useSavedMeals()
  const { searchFoods, addFoodLog, addCustomFood, toggleFavorite } = useFoods()
  const barcode = useBarcodeLookup()
  const userId = useAuthStore(s => s.userId)
  // AI meal estimates need a paid API key on the server — off unless explicitly enabled.
  const aiAvailable = AI_FOOD_ENABLED && isSupabaseConfigured && !!userId

  // Map of foodUuid → most recent log (when, and how much) within the recent window.
  const recentMapRaw = useLiveQuery(async () => {
    const since = daysAgoIso(RECENT_WINDOW_DAYS)
    const logs = await db.foodLog.where('date').aboveOrEqual(since).toArray()
    const m = new Map<string, RecentUse>()
    for (const log of logs) {
      if (log.updatedAt > (m.get(log.foodId)?.at ?? 0)) m.set(log.foodId, { at: log.updatedAt, servings: log.servings })
    }
    return m
  }, [])
  const recentMap = useMemo(() => recentMapRaw ?? new Map<string, RecentUse>(), [recentMapRaw])
  const mealResults = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return (savedMeals ?? []).filter(m => words.every(w => m.name.toLowerCase().includes(w)))
  }, [savedMeals, query])

  const baseResults = searchFoods(query)
  const results = useMemo(() => {
    return [...baseResults].sort((a, b) => {
      const ra = recentMap.get(a.uuid)?.at ?? 0
      const rb = recentMap.get(b.uuid)?.at ?? 0
      if (ra && !rb) return -1
      if (rb && !ra) return 1
      if (ra && rb) return rb - ra
      return a.name.localeCompare(b.name)
    })
  }, [baseResults, recentMap])

  function getEffectiveServings(): number {
    if (inputMode === 'grams' && selected && usesGrams(selected)) {
      const g = parseFloat(grams)
      if (g > 0 && selected.servingSize > 0) return g / selected.servingSize
    }
    return Math.max(0.1, parseFloat(servings) || 1)
  }

  const macros = selected ? computeMacros(selected, getEffectiveServings()) : null

  async function logFood(food: Food, n: number) {
    const uuid = await addFoodLog({ date, foodId: food.uuid, servings: n, mealType })
    setAdded(a => [...a, { label: `${food.name}, ${amountLabel(food, n)}`, kcal: food.kcalPerServing * n, uuids: [uuid] }])
  }

  // Stay open after adding, back on the list, so a whole meal can go in one visit.
  async function handleAdd() {
    if (!selected) return
    await logFood(selected, getEffectiveServings())
    setSelected(null)
    setQuery('')
  }

  async function handleAddMeal(meal: SavedMealWithSummary) {
    const uuids = await logMealItems(meal.items, date, mealType)
    setAdded(a => [...a, { label: meal.name, kcal: meal.kcal, uuids }])
    setQuery('')
  }

  async function undoLast() {
    const last = added.at(-1)
    if (!last) return
    await unlogFoods(last.uuids)
    setAdded(a => a.slice(0, -1))
  }

  // Starts from the amount logged last time, so a repeat is select → Add.
  function handleFoodSelect(food: Food) {
    const n = recentMap.get(food.uuid)?.servings ?? 1
    setSelected(food)
    setServings(String(n))
    setGrams(String(Math.round(n * food.servingSize)))
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
    setAiText('')
    setAiLoading(false)
    setAiResult(null)
    setAdded([])
    barcode.clear()
    onClose()
  }

  async function handleAiSubmit() {
    const text = aiText.trim()
    if (!text || aiLoading) return
    setAiLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('parse-food', { body: { text } })
      if (error) {
        toast.error("Couldn't reach the AI service — try searching instead")
        return
      }
      if (!data || data.ok !== true || !data.food) {
        toast.error("Couldn't read the response — try rephrasing or use search")
        return
      }
      setAiResult(data.food as AiParsedFood)
    } catch {
      toast.error("Couldn't reach the AI service — try searching instead")
    } finally {
      setAiLoading(false)
    }
  }

  async function handleAiConfirm(food: {
    name: string
    kcal: number
    protein: number
    carbs: number
    fat: number
    notes: string
  }) {
    // Persist as a reusable Food (one serving = the whole portion the user described).
    const saved = await addCustomFood({
      name: food.name,
      kcalPerServing: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      servingSize: 1,
      servingUnit: 'serving',
      isFavorite: false,
      notes: food.notes || undefined,
    })
    await addFoodLog({ date, foodId: saved.uuid, servings: 1, mealType })
    handleClose()
  }

  function handleBarcodeResult(code: string) {
    setShowScanner(false)
    void barcode.lookup(code)
  }

  async function handleScanSaved(reviewed: ReviewedFood) {
    const food = await saveScannedFood(reviewed)
    barcode.clear()
    handleFoodSelect(food) // amount defaults to one package serving
  }

  if (barcode.lookingUp) {
    return (
      <Dialog open={open} onOpenChange={open => !open && handleClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Looking up product…</DialogTitle>
          </DialogHeader>
          <Loader2 size={28} className="mx-auto my-6 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    )
  }

  if (barcode.scan) {
    return (
      <Dialog open={open} onOpenChange={open => !open && handleClose()}>
        <DialogContent className="max-w-sm p-0 gap-0">
          <DialogHeader className="p-4 pb-3">
            <DialogTitle>Check product</DialogTitle>
          </DialogHeader>
          <ScannedFoodReview
            key={`${barcode.scan.barcode}-${barcode.scan.source}`}
            scan={barcode.scan}
            onBack={barcode.clear}
            onRecheck={barcode.scan.source === 'saved' ? () => void barcode.recheck() : undefined}
            onSave={handleScanSaved}
          />
        </DialogContent>
      </Dialog>
    )
  }

  if (showScanner) {
    return (
      <Dialog open={open} onOpenChange={open => !open && handleClose()}>
        <DialogContent className="max-w-sm p-0 gap-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<p className="p-8 text-center text-sm text-muted-foreground">Starting camera…</p>}>
            <BarcodeScanner
              onResult={handleBarcodeResult}
              onCancel={() => setShowScanner(false)}
            />
          </Suspense>
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

  if (aiResult) {
    return (
      <Dialog open={open} onOpenChange={open => !open && handleClose()}>
        <DialogContent className="max-w-sm p-0 gap-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Confirm & Log — {mealType}</DialogTitle>
          </DialogHeader>
          <AiFoodConfirm
            parsed={aiResult}
            onBack={() => setAiResult(null)}
            onConfirm={handleAiConfirm}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      {/* minmax(0,1fr): long names truncate instead of widening the dialog past the screen */}
      <DialogContent className="max-w-sm grid-cols-[minmax(0,1fr)] p-0 gap-0">
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
            {aiAvailable && (
              <div className="px-4 pb-3 flex flex-col gap-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Sparkles size={14} className="text-primary" />
                  Describe what you ate
                </Label>
                <textarea
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder='e.g. "two slices of pepperoni pizza and a coke"'
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={aiLoading}
                />
                <Button
                  type="button"
                  onClick={handleAiSubmit}
                  disabled={!aiText.trim() || aiLoading}
                  className="w-full gap-2"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Estimating…
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Estimate with AI
                    </>
                  )}
                </Button>
              </div>
            )}

            {aiAvailable && (
              <div className="px-4 pb-2 flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or search the catalog</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            <div className="px-4 pb-2 flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search foods…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="pl-9"
                  autoFocus={!aiAvailable}
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
            <ScrollArea className={cn(aiAvailable ? 'h-[200px]' : 'h-[300px]', '[&_[data-radix-scroll-area-viewport]>div]:!block')}>
              <div className="px-2 pb-2">
                <FoodResults
                  foods={results}
                  meals={mealResults}
                  recent={recentMap}
                  onSelect={handleFoodSelect}
                  onQuickAdd={(food, n) => void logFood(food, n)}
                  onAddMeal={meal => void handleAddMeal(meal)}
                  onToggleFavorite={food => void toggleFavorite(food.uuid)}
                />
              </div>
            </ScrollArea>
            {added.length > 0 && (
              <div className="mx-4 mb-2 flex items-center gap-2 rounded-2xl bg-primary/10 py-1.5 pl-3 pr-1.5">
                <Check size={16} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block truncate">{added[added.length - 1].label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {added.length} added · {Math.round(added.reduce((sum, a) => sum + a.kcal, 0)).toLocaleString()} cal
                  </span>
                </span>
                <button type="button" onClick={() => void undoLast()} className="h-10 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground">Undo</button>
                <Button size="sm" className="shrink-0" onClick={handleClose}>Done</Button>
              </div>
            )}
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
