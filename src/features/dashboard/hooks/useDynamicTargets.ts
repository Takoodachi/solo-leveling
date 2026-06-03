import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { today } from '@/lib/date'
import { computeDynamicTargets, type DynamicTargets, type DynamicBreakdown } from '@/lib/macroTargets'
import { subDays, format, parseISO } from 'date-fns'

export interface UseDynamicTargetsResult {
  dynamic: boolean
  targets: DynamicTargets | undefined
  breakdown: DynamicBreakdown | undefined
}

function windowDatesEndingAt(refDate: string, windowDays: number): string[] {
  const end = parseISO(refDate)
  const dates: string[] = []
  for (let i = 0; i < windowDays; i++) {
    dates.push(format(subDays(end, i), 'yyyy-MM-dd'))
  }
  return dates
}

export function useDynamicTargets(refDate?: string): UseDynamicTargetsResult {
  const ref = refDate ?? today()
  const data = useLiveQuery(async () => {
    const [settings, baseline, latestWeight] = await Promise.all([
      db.settings.get(1),
      db.targets.get(1),
      // Latest body weight on or before the viewed day, so past days use the
      // weight that was current then (identical to "latest" when ref is today).
      db.bodyMetrics.where('date').belowOrEqual(ref).reverse().first(),
    ])

    if (!settings?.dynamicTargetsEnabled || !baseline) {
      return { dynamic: false, targets: undefined, breakdown: undefined }
    }

    const windowDays = settings.activityWindowDays ?? 7
    const windowDates = windowDatesEndingAt(ref, windowDays)
    const earliest = windowDates[windowDates.length - 1]

    const dailyActivity = await db.dailyActivity.where('date').aboveOrEqual(earliest).toArray()

    const result = computeDynamicTargets({
      baseline,
      windowDays,
      bodyKg: latestWeight?.weightKg,
      dailyActivity,
      windowDates,
    })

    return { dynamic: true, targets: result.targets, breakdown: result.breakdown }
  }, [ref])

  return data ?? { dynamic: false, targets: undefined, breakdown: undefined }
}
