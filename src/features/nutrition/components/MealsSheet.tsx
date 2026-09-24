import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatKcal } from '@/lib/format'
import type { FoodLogWithFood, MealType } from '@/types'
import { useSavedMeals, saveMeal, deleteMeal, pastDayLabel, type PastMeal, type SavedMealWithSummary } from '../hooks/useMeals'
import { logMealItems, toastLogged, itemCount, MEAL_LABELS, type MealItem } from '../logFoods'
import MealOptionRow from './MealOptionRow'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealType: MealType
  date: string
  entries: FoodLogWithFood[]
  recent: PastMeal[]
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Saved and recent meals for one meal slot, plus saving what's logged there now. */
export default function MealsSheet({ open, onOpenChange, mealType, date, entries, recent }: Props) {
  const saved = useSavedMeals() ?? []
  const [name, setName] = useState('')
  const label = MEAL_LABELS[mealType].toLowerCase()
  // Meals saved from this slot first; the sort is stable, so each half stays alphabetical.
  const ordered = [...saved].sort((a, b) => Number(b.mealType === mealType) - Number(a.mealType === mealType))

  async function add(items: MealItem[], what: string) {
    const uuids = await logMealItems(items, date, mealType)
    toastLogged(`Added ${what} to ${label}`, uuids)
    onOpenChange(false)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await saveMeal(name, mealType, entries)
    toast.success(`Saved “${name.trim()}”`)
    setName('')
  }

  async function remove(meal: SavedMealWithSummary) {
    const restore = await deleteMeal(meal)
    toast(`Deleted “${meal.name}”`, { action: { label: 'Undo', onClick: () => void restore() } })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-4">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="text-xl">{MEAL_LABELS[mealType]} meals</SheetTitle>
          <SheetDescription>Add a whole meal in one tap.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6">
          {entries.length > 0 && (
            <form onSubmit={e => void save(e)} className="flex flex-col gap-2">
              <p className="eyebrow text-muted-foreground">Save this {label} · {itemCount(entries.length)}</p>
              <div className="flex gap-2">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={`e.g. Usual ${label}`} enterKeyHint="done" maxLength={40} />
                <Button type="submit" disabled={!name.trim()}>Save</Button>
              </div>
            </form>
          )}

          <section className="flex flex-col gap-2">
            <p className="eyebrow text-muted-foreground">Saved meals</p>
            {ordered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing saved yet. Log a meal, then save it here to add it again in one tap.</p>
            ) : (
              ordered.map(m => (
                <MealOptionRow
                  key={m.uuid}
                  title={m.name}
                  subtitle={`${formatKcal(m.kcal)} cal · ${m.names}`}
                  onAdd={() => void add(m.items, `“${m.name}”`)}
                  action={
                    <button type="button" onClick={() => void remove(m)} aria-label={`Delete ${m.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-destructive">
                      <Trash2 size={16} />
                    </button>
                  }
                />
              ))
            )}
          </section>

          {recent.length > 0 && (
            <section className="flex flex-col gap-2">
              <p className="eyebrow text-muted-foreground">Recent {label}</p>
              {recent.map(r => (
                <MealOptionRow
                  key={r.date}
                  title={capitalize(pastDayLabel(r.date, date))}
                  subtitle={`${formatKcal(r.kcal)} cal · ${r.names}`}
                  onAdd={() => void add(r.items, itemCount(r.items.length))}
                />
              ))}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
