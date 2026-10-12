import { differenceInCalendarDays, parseISO } from 'date-fns'

/**
 * A scale reading moves by a kilo or more from one day to the next on water, salt and what's
 * still in the gut. The trend is the reading with that noise taken out: an exponentially
 * smoothed average in which each day moves a tenth of the way to the scale (the "Hacker's Diet"
 * trend line, also what adaptive calorie apps smooth with). A gap between weigh-ins counts for
 * its days, so after a week away the trend catches up further in one step.
 */
const DAILY_SHARE = 0.1

export interface Weighed {
  date: string // YYYY-MM-DD
  weightKg: number
}

const daysBetween = (from: string, to: string) => differenceInCalendarDays(parseISO(to), parseISO(from))

/** The weigh-ins (oldest first) with the trend at each one, to two decimals. */
export function withTrend<T extends Weighed>(sorted: readonly T[]): (T & { trend: number })[] {
  let trend = 0
  return sorted.map((point, i) => {
    if (i === 0) trend = point.weightKg
    else {
      const days = Math.max(1, daysBetween(sorted[i - 1].date, point.date))
      trend += (1 - (1 - DAILY_SHARE) ** days) * (point.weightKg - trend)
    }
    return { ...point, trend: Math.round(trend * 100) / 100 }
  })
}

/** At least this many weigh-ins, over at least this many days, before a rate means anything. */
const MIN_POINTS = 3
const MIN_SPAN_DAYS = 7

/**
 * How fast the weight is moving, in kg per day: the slope of the straight line that fits the
 * weigh-ins best (least squares). Unlike the smoothed trend it doesn't lag, so it's what rates
 * are worked out from. Null with too few weigh-ins, or all of them within a week.
 */
export function weightSlope(points: readonly Weighed[]): number | null {
  if (points.length < MIN_POINTS) return null
  const first = points.reduce((min, p) => (p.date < min ? p.date : min), points[0].date)
  const xs = points.map(p => daysBetween(first, p.date))
  if (Math.max(...xs) < MIN_SPAN_DAYS) return null
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length
  const meanY = points.reduce((a, p) => a + p.weightKg, 0) / points.length
  let top = 0
  let bottom = 0
  points.forEach((p, i) => {
    top += (xs[i] - meanX) * (p.weightKg - meanY)
    bottom += (xs[i] - meanX) ** 2
  })
  return bottom > 0 ? top / bottom : null
}
