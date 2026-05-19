import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFoods } from '../hooks/useFoods'
import type { MealType } from '@/types'

interface Props {
  date: string
  mealType: MealType
}

export default function FavoriteFoods({ date, mealType }: Props) {
  const { favorites, addFoodLog } = useFoods()

  if (favorites.length === 0) return null

  async function handleAdd(foodUuid: string) {
    await addFoodLog({ date, foodId: foodUuid, servings: 1, mealType })
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Star size={13} className="text-yellow-500" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Favorites
        </span>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-1">
          {favorites.map(food => (
            <Button
              key={food.uuid}
              variant="outline"
              size="sm"
              className="shrink-0 h-8 text-xs"
              onClick={() => void handleAdd(food.uuid)}
            >
              {food.name}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
