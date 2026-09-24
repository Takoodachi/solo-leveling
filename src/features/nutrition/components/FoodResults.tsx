import { Bookmark, Plus, Star } from 'lucide-react'
import { formatKcal } from '@/lib/format'
import type { Food } from '@/types'
import type { SavedMealWithSummary } from '../hooks/useMeals'
import { amountLabel } from '../logFoods'
import MealOptionRow from './MealOptionRow'

/** When a food was last logged (within the recent window) and how much. */
export interface RecentUse {
  at: number
  servings: number
}

interface Props {
  foods: Food[]
  meals: SavedMealWithSummary[]
  recent: Map<string, RecentUse>
  onSelect: (food: Food) => void
  onQuickAdd: (food: Food, servings: number) => void
  onAddMeal: (meal: SavedMealWithSummary) => void
  onToggleFavorite: (food: Food) => void
}

/** Search results in the add-food dialog: saved meals first, then foods (recent ones on top). */
export default function FoodResults({ foods, meals, recent, onSelect, onQuickAdd, onAddMeal, onToggleFavorite }: Props) {
  if (foods.length === 0 && meals.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No foods found</p>
  }

  return (
    <>
      {meals.length > 0 && (
        <div className="flex flex-col gap-1.5 px-2 pb-2">
          {meals.map(m => (
            <MealOptionRow
              key={m.uuid}
              icon={<Bookmark size={16} className="shrink-0 text-primary" />}
              title={m.name}
              subtitle={`${formatKcal(m.kcal)} cal · ${m.names}`}
              onAdd={() => onAddMeal(m)}
            />
          ))}
        </div>
      )}
      {foods.map(food => {
        const last = recent.get(food.uuid)
        return (
          // Row, quick add and favorite star are sibling buttons (a button can't contain a button).
          <div key={food.uuid} className="flex items-center rounded-xl pr-1 transition-colors hover:bg-accent">
            <button type="button" onClick={() => onSelect(food)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm">{food.name}</p>
                {last && (
                  <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">Recent</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {last
                  ? `Last: ${amountLabel(food, last.servings)} · ${formatKcal(food.kcalPerServing * last.servings)} cal`
                  : `${food.kcalPerServing} cal / ${food.servingSize}${food.servingUnit}`}
              </p>
            </button>
            {last && (
              <button
                type="button"
                onClick={() => onQuickAdd(food, last.servings)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary"
                aria-label={`Add ${amountLabel(food, last.servings)} of ${food.name}`}
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggleFavorite(food)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              aria-label={food.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={16} className={food.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} />
            </button>
          </div>
        )
      })}
    </>
  )
}
