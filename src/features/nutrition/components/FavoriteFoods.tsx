import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFoods } from '../hooks/useFoods'
import { lastServings, logFoods, toastLogged, MEAL_LABELS } from '../logFoods'
import type { Food, MealType } from '@/types'

interface Props {
  date: string
  mealType: MealType
}

/** One tap logs a favorite into the current meal, in the amount used last time. */
export default function FavoriteFoods({ date, mealType }: Props) {
  const { favorites } = useFoods()

  if (favorites.length === 0) return null

  async function handleAdd(food: Food) {
    const uuids = await logFoods([{ date, foodId: food.uuid, servings: await lastServings(food.uuid), mealType }])
    toastLogged(`Added ${food.name} to ${MEAL_LABELS[mealType].toLowerCase()}`, uuids)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Star size={13} className="text-yellow-500" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Favorites · add to {MEAL_LABELS[mealType].toLowerCase()}
        </span>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-1">
          {favorites.map(food => (
            <Button
              key={food.uuid}
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => void handleAdd(food)}
            >
              {food.name}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
