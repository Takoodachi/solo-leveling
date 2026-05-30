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

function windowDatesIncludingToday(windowDays: number): string[] {
  const todayDate = parseISO(today())
  const dates: string[] = []
  for (let i = 0; i < windowDays; i++) {
    dates.push(format(subDays(todayDate, i), 'yyyy-MM-dd'))
  }
  return dates
}

export function useDynamicTargets(): UseDynamicTargetsResult {
  const data = useLiveQuery(async () => {
    const [settings, baseline, latestWeight] = await Promise.all([
      db.settings.get(1),
      db.targets.get(1),
      db.bodyMetrics.orderBy('date').reverse().first(),
    ])

    if (!settings?.dynamicTargetsEnabled || !baseline) {
      return { dynamic: false, targets: undefined, breakdown: undefined }
    }

    const windowDays = settings.activityWindowDays ?? 7
    const windowDates = windowDatesIncludingToday(windowDays)
    const earliest = windowDates[windowDates.length - 1]

    const [dailyActivity, workouts] = await Promise.all([
      db.dailyActivity.where('date').aboveOrEqual(earliest).toArray(),
      db.workouts.where('date').aboveOrEqual(earliest).toArray(),
    ])

    const result = computeDynamicTargets({
      baseline,
      windowDays,
      bodyKg: latestWeight?.weightKg,
      dailyActivity,
      workouts,
      windowDates,
    })

    return { dynamic: true, targets: result.targets, breakdown: result.breakdown }
  }, [])

  return data ?? { dynamic: false, targets: undefined, breakdown: undefined }
}
