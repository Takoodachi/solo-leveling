import { lazy, Suspense, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { subDays } from 'date-fns'
import { Search, ScanLine, Sparkles, Loader2, Check, WifiOff } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import Segmented from '@/components/Segmented'
import { toDateStr } from '@/lib/date'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/features/auth/authStore'
import { useFoods, saveScannedFood, removeCustomFood, barcodeFoodId } from '../hooks/useFoods'
import { useBarcodeLookup } from '../hooks/useBarcodeLookup'
import { useOnlineFoodSearch, onlineKey, MIN_ONLINE_QUERY } from '../hooks/useOnlineFoodSearch'
import type { ReviewedFood, ScannedFood } from '../openFoodFacts'
import { useOnline } from '@/hooks/useOnline'
import ScannedFoodReview from './ScannedFoodReview'
import CustomFoodForm from './CustomFoodForm'
import AiFoodConfirm, { type AiParsedFood, type ConfirmedFood } from './AiFoodConfirm'
import FoodResults, { type RecentUse } from './FoodResults'
import OnlineFoodResults from './OnlineFoodResults'
import QuickAddCalories from './QuickAddCalories'
import FoodAmountFields from './FoodAmountFields'
import { amountDraft, servingsOf, EMPTY_AMOUNT, type AmountDraft } from '../foodAmount'
import { useSavedMeals, type SavedMealWithSummary } from '../hooks/useMeals'
import { logMealItems, unlogFoods, amountLabel, MEAL_OPTIONS } from '../logFoods'
import type { Food, MealType } from '@/types'
import { QUICK_ADD_FOOD } from '@/data/basics'

interface Props {
  open: boolean
  onClose: () => void
  date: string
  /** The meal it opens on; the dialog can pick another. */
  mealType: MealType
  /** Pre-filled search (from search on Home). */
  initialQuery?: string
}

// The barcode library is large; load it only when the scanner opens.
const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

const RECENT_WINDOW_DAYS = 14
// A phone or tablet: no focus on the search by itself there, or the on-screen keyboard comes up on
// opening and again after every food added (the list view remounts it), covering the recent foods
const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const AI_FOOD_ENABLED = import.meta.env.VITE_ENABLE_AI_FOOD === 'true'

function daysAgoIso(days: number): string {
  return toDateStr(subDays(new Date(), days))
}

/** What's been added since the dialog opened (it stays open to add several things). */
interface Added {
  label: string
  kcal: number
  uuids: string[]
}

export default function AddFoodDialog({ open, onClose, date, mealType, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [selected, setSelected] = useState<Food | null>(null)
  const [amount, setAmount] = useState<AmountDraft>(EMPTY_AMOUNT)
  const [showCustom, setShowCustom] = useState(false)
  const [showQuick, setShowQuick] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AiParsedFood | null>(null)
  const [added, setAdded] = useState<Added[]>([])
  // The meal picked in the dialog: opened from +, the meal is only a guess from the time of day
  const [pickedMeal, setPickedMeal] = useState<MealType | null>(null)
  const into = pickedMeal ?? mealType
  const savedMeals = useSavedMeals()
  const { foods, searchFoods, addFoodLog, addCustomFood, toggleFavorite } = useFoods()
  const barcode = useBarcodeLookup()
  const onlineSearch = useOnlineFoodSearch()
  const online = useOnline()
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

  // An online search belongs to the words it was made with: other words, and it's out of sight
  const typed = query.trim()
  const searchedOnline = onlineSearch.state?.key === onlineKey(query) ? onlineSearch.state : null
  const savedBarcodes = useMemo(
    () => new Set(foods.flatMap(f => (f.uuid.startsWith('barcode-') ? [f.uuid.slice('barcode-'.length)] : []))),
    [foods],
  )

  async function logFood(food: Food, n: number) {
    const uuid = await addFoodLog({ date, foodId: food.uuid, servings: n, mealType: into })
    setAdded(a => [...a, { label: `${food.name}, ${amountLabel(food, n)}`, kcal: food.kcalPerServing * n, uuids: [uuid] }])
  }

  // Stay open after adding, back on the list, so a whole meal can go in one visit.
  async function handleAdd() {
    if (!selected) return
    await logFood(selected, servingsOf(selected, amount))
    setSelected(null)
    setQuery('')
  }

  async function handleAddMeal(meal: SavedMealWithSummary) {
    const uuids = await logMealItems(meal.items, date, into)
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
    setAmount(amountDraft(food, n))
  }

  // A product found online: one saved before goes straight to its amount, a new one is checked first
  function handlePickOnline(found: ScannedFood) {
    const saved = foods.find(f => f.uuid === barcodeFoodId(found.barcode))
    if (saved) handleFoodSelect(saved)
    else void barcode.review(found)
  }

  function handleClose() {
    setQuery('')
    setSelected(null)
    setAmount(EMPTY_AMOUNT)
    setShowCustom(false)
    setShowQuick(false)
    setShowScanner(false)
    setAiText('')
    setAiLoading(false)
    setAiResult(null)
    setAdded([])
    setPickedMeal(null)
    barcode.clear()
    onlineSearch.clear()
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

  async function handleAiConfirm(food: ConfirmedFood) {
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
    await addFoodLog({ date, foodId: saved.uuid, servings: 1, mealType: into })
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

  if (showQuick) {
    return (
      <Dialog open={open} onOpenChange={open => !open && handleClose()}>
        <DialogContent className="max-w-sm gap-0 p-0">
          <DialogHeader className="p-4 pb-3">
            <DialogTitle>Quick add — {into}</DialogTitle>
          </DialogHeader>
          <QuickAddCalories
            onBack={() => setShowQuick(false)}
            onAdd={async kcal => {
              await logFood(QUICK_ADD_FOOD, kcal)
              setShowQuick(false)
            }}
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
            initialName={query.trim()}
            // Straight to its amount: it was made to be logged
            onSuccess={food => {
              setShowCustom(false)
              handleFoodSelect(food)
            }}
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
            <DialogTitle>Confirm & Log — {into}</DialogTitle>
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
      {/* A column where only the list gives way: with the keyboard up there's less room, and the
          search field and the buttons under the list have to stay on screen */}
      <DialogContent className="flex max-w-sm flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 p-4 pb-2">
          <DialogTitle>Add food</DialogTitle>
        </DialogHeader>
        <div className="shrink-0 px-4 pb-3">
          <Segmented size="sm" value={into} options={MEAL_OPTIONS} onChange={setPickedMeal} className="bg-secondary" />
        </div>

        {selected ? (
          <div className="px-4 pb-4 flex flex-col gap-4">
            {/* Food info */}
            <div className="rounded-md bg-muted p-3">
              <p className="font-medium text-sm">{selected.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                per {selected.servingSize}{selected.servingUnit}
              </p>
            </div>

            <FoodAmountFields food={selected} draft={amount} onChange={setAmount} />

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Back</Button>
              <Button className="flex-1" onClick={handleAdd}>Add</Button>
            </div>
            {selected.isCustom && (
              <Button
                variant="ghost"
                size="sm"
                className="-mt-2 text-muted-foreground"
                onClick={() => {
                  void removeCustomFood(selected)
                  setSelected(null)
                }}
              >
                Remove from my foods
              </Button>
            )}
          </div>
        ) : (
          <>
            {aiAvailable && (
              <div className="flex shrink-0 flex-col gap-2 px-4 pb-3">
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
              <div className="flex shrink-0 items-center gap-2 px-4 pb-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or search the catalog</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            <div className="flex shrink-0 gap-2 px-4 pb-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search foods…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="pl-9"
                  autoFocus={!aiAvailable && !TOUCH}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowScanner(true)}
                aria-label={online ? 'Scan barcode' : 'Scan barcode (offline: saved products only)'}
                className="relative"
              >
                <ScanLine size={18} />
                {!online && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-amber-950">
                    <WifiOff className="!size-2.5" strokeWidth={3} />
                  </span>
                )}
              </Button>
            </div>
            <div className={cn(aiAvailable ? 'h-[200px]' : 'h-[300px]', 'min-h-[7.5rem] overflow-y-auto overscroll-contain')}>
              <div className="px-2 pb-2">
                <FoodResults
                  key={query} // a new search starts at its first page
                  foods={results}
                  meals={mealResults}
                  recent={recentMap}
                  onSelect={handleFoodSelect}
                  onQuickAdd={(food, n) => void logFood(food, n)}
                  onAddMeal={meal => void handleAddMeal(meal)}
                  onToggleFavorite={food => void toggleFavorite(food.uuid)}
                />
                {typed.length >= MIN_ONLINE_QUERY && (
                  <OnlineFoodResults
                    query={typed}
                    search={searchedOnline}
                    online={online}
                    saved={savedBarcodes}
                    onSearch={() => void onlineSearch.search(query)}
                    onPick={handlePickOnline}
                  />
                )}
              </div>
            </div>
            {added.length > 0 && (
              <div className="mx-4 mb-2 flex shrink-0 items-center gap-2 rounded-2xl bg-primary/10 py-1.5 pl-3 pr-1.5">
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
            <div className="flex shrink-0 gap-1 px-4 pb-4">
              <Button variant="ghost" size="sm" className="flex-1 px-2 text-muted-foreground" onClick={() => setShowQuick(true)}>
                + Just calories
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 px-2 text-muted-foreground" onClick={() => setShowCustom(true)}>
                + Create custom food
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
