import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { today } from '@/lib/date'
import {
  macroAdherenceByDate, lastNDates,
  type MacroPoint,
} from '@/lib/analytics'
import { computeDynamicTargets } from '@/lib/macroTargets'
import { subDays, format, parseISO } from 'date-fns'

interface MacroResult {
  rows: MacroPoint[]
  targetKcal: number
  hasData: boolean
}

export function useMacroAdherence(rangeDays: number): MacroResult {
  const data = useLiveQuery(async () => {
    const dates = lastNDates(rangeDays, today())
    const earliest = dates[0]
    const logs = await db.foodLog.where('date').aboveOrEqual(earliest).toArray()
    const foodIds = [...new Set(logs.map(l => l.foodId))]
    const foods = await db.foods.bulkGet(foodIds)
    const foodMap = new Map(foods.flatMap(f => (f ? [[f.uuid, f]] : [])))

    const baseline = await db.targets.get(1)
    const settings = await db.settings.get(1)
    let targetKcal = baseline?.dailyKcal ?? 2000

    if (baseline && settings?.dynamicTargetsEnabled) {
      const windowDays = settings.activityWindowDays ?? 7
      const todayDate = parseISO(today())
      const windowDates = Array.from({ length: windowDays }, (_, i) =>
        format(subDays(todayDate, i), 'yyyy-MM-dd'),
      )
      const windowEarliest = windowDates[windowDates.length - 1]
      const [activity, latestWeight] = await Promise.all([
        db.dailyActivity.where('date').aboveOrEqual(windowEarliest).toArray(),
        db.bodyMetrics.orderBy('date').reverse().first(),
      ])
      const dyn = computeDynamicTargets({
        baseline,
        windowDays,
        bodyKg: latestWeight?.weightKg,
        dailyActivity: activity,
        windowDates,
      })
      targetKcal = dyn.targets.kcal
    }

    const rows = macroAdherenceByDate(logs, foodMap, dates)
    return {
      rows,
      targetKcal,
      hasData: logs.length > 0,
    }
  }, [rangeDays])

  return data ?? { rows: [], targetKcal: 2000, hasData: false }
}
