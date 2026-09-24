import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO, subDays } from 'date-fns'
import { Copy } from 'lucide-react'
import { db } from '@/db'
import { formatKcal } from '@/lib/format'
import { logFoods, toastLogged, itemCount } from '../logFoods'
import MealOptionRow from './MealOptionRow'

/** On an empty day: copy everything logged the day before, meal by meal, in one tap. */
export default function CopyDayCard({ date }: { date: string }) {
  const prev = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')
  const yesterday = useLiveQuery(async () => {
    const logs = await db.foodLog.where('date').equals(prev).toArray()
    const foods = await db.foods.bulkGet(logs.map(l => l.foodId))
    const kept = logs.filter((_, i) => foods[i])
    const kcal = logs.reduce((sum, l, i) => sum + (foods[i] ? foods[i].kcalPerServing * l.servings : 0), 0)
    return kept.length > 0 ? { logs: kept, kcal } : null
  }, [prev])
  if (!yesterday) return null

  async function copy() {
    if (!yesterday) return
    const uuids = await logFoods(yesterday.logs.map(l => ({ date, foodId: l.foodId, servings: l.servings, mealType: l.mealType })))
    toastLogged(`Copied ${itemCount(uuids.length)} from the day before`, uuids)
  }

  return (
    <MealOptionRow
      className="bg-card"
      icon={<Copy size={16} className="shrink-0 text-primary" />}
      title={`Copy ${format(parseISO(prev), 'EEEE')}’s food`}
      subtitle={`${itemCount(yesterday.logs.length)} · ${formatKcal(yesterday.kcal)} cal, same meals`}
      onAdd={() => void copy()}
    />
  )
}
