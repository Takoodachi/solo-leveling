import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { foodsById } from '@/db/read'
import { today } from '@/lib/date'
import {
  macroAdherenceByDate, lastNDates,
  type MacroPoint,
} from '@/lib/analytics'
import { loadStepBurns } from '@/lib/stepCalories'

export interface MacroDay extends MacroPoint {
  stepKcal: number
  /** Eaten minus steps, on days with both food and steps (null otherwise). */
  netKcal: number | null
}

interface MacroResult {
  rows: MacroDay[]
  targetKcal: number
  hasData: boolean
}

export function useMacroAdherence(rangeDays: number): MacroResult {
  const data = useLiveQuery(async () => {
    const dates = lastNDates(rangeDays, today())
    const earliest = dates[0]
    const logs = await db.foodLog.where('date').aboveOrEqual(earliest).toArray()
    const [foodMap, baseline, burns] = await Promise.all([
      foodsById(),
      db.targets.get(1),
      loadStepBurns(dates),
    ])

    const rows = macroAdherenceByDate(logs, foodMap, dates).map(p => {
      const stepKcal = burns.get(p.date)?.kcal ?? 0
      return { ...p, stepKcal, netKcal: stepKcal > 0 && p.totalKcal > 0 ? p.totalKcal - stepKcal : null }
    })
    return {
      rows,
      targetKcal: baseline?.dailyKcal ?? 2000,
      hasData: logs.length > 0,
    }
  }, [rangeDays])

  return data ?? { rows: [], targetKcal: 2000, hasData: false }
}
