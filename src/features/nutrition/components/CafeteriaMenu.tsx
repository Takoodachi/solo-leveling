import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Segmented from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { useNow } from '@/hooks/useNow'
import { normalize } from '@/lib/search'
import type { Food, MealType } from '@/types'
import { HALLS, cafeMealFor, cafeteriaFood, lastHall, rememberHall, type CafeItem, type Hall } from '../cafeteria'
import { useCafeteriaMenu } from '../hooks/useCafeteriaMenu'

const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' } as const

interface Props {
  /** The day being logged (YYYY-MM-DD): its menu is the one shown. */
  date: string
  /** The meal the dialog logs into is the menu shown (a snack: the meal the clock is nearest). */
  mealType: MealType
  /** What's typed in the dialog's search narrows the menu. */
  query: string
  onPick: (food: Food) => void
}

/** The school cafeteria's menu for the day (Android app only), by hall and station; a tap picks an item to log. */
export default function CafeteriaMenu({ date, mealType, query, onPick }: Props) {
  const now = useNow()
  const [hall, setHall] = useState<Hall>(lastHall)
  const meal = cafeMealFor(mealType, now)
  const { stations, error, loading, retry } = useCafeteriaMenu(hall, meal, date)
  const q = normalize(query.trim())
  const shown = (stations ?? [])
    .map(s => ({ ...s, items: q ? s.items.filter(i => normalize(i.name).includes(q)) : s.items }))
    .filter(s => s.items.length > 0)

  async function pick(item: CafeItem) {
    onPick(await cafeteriaFood(item, hall))
  }

  return (
    <div className="px-2 pb-2">
      {/* Stays at the top of the list while it scrolls, so the hall can be switched from anywhere */}
      <div className="sticky top-0 z-10 bg-card px-2 pb-1">
        <Segmented
          size="sm"
          value={hall}
          onChange={h => { setHall(h); rememberHall(h) }}
          options={HALLS.map(h => ({ value: h.slug, label: h.short }))}
          className="bg-secondary"
        />
        <p className="px-1 pt-1.5 text-xs text-muted-foreground">{MEAL_LABEL[meal]} menu</p>
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading the menu…
        </p>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-muted-foreground">Couldn’t load the cafeteria’s menu.</p>
          <Button variant="outline" size="sm" onClick={retry}>Try again</Button>
        </div>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {q ? `Nothing on this menu matches “${query.trim()}”` : `No ${meal} on the menu for this day`}
        </p>
      ) : (
        shown.map(station => (
          <section key={station.name}>
            <h3 className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{station.name}</h3>
            {station.items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => void pick(item)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{item.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    P {item.protein}g · C {item.carbs}g · F {item.fat}g · {item.servingSize} {item.servingUnit}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums">
                  {item.kcal} <span className="text-xs text-muted-foreground">cal</span>
                </span>
              </button>
            ))}
          </section>
        ))
      )}
    </div>
  )
}
