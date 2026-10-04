import { useState } from 'react'
import { Link } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { ChevronRight, X } from 'lucide-react'
import { weekDates } from '@/lib/date'
import { useWeekSummary } from '@/features/dashboard/hooks/useWeekSummary'
import { lastWeekStart } from '../recap'

const SEEN_KEY = 'solo:recapSeen'

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

/** Home: last week's recap, from Monday until it's opened or dismissed. */
export default function RecapBanner({ now }: { now: Date }) {
  const week = lastWeekStart(now)
  const [seen, setSeen] = useState(readSeen)
  const due = seen !== week
  const days = useWeekSummary(due ? weekDates(parseISO(week)) : [])
  if (!due || !days?.length) return null

  const workouts = days.reduce((n, d) => n + d.workouts, 0)
  const steps = days.reduce((n, d) => n + d.steps, 0)
  if (workouts === 0 && steps === 0 && !days.some(d => d.foodLogged)) return null

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, week)
    } catch {
      // it just shows again next time
    }
    setSeen(week)
  }
  const summary = [
    workouts > 0 && `${workouts} workout${workouts === 1 ? '' : 's'}`,
    steps > 0 && `${steps.toLocaleString()} steps`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center gap-1 rounded-3xl bg-brand-gradient py-4 pl-5 pr-2 text-primary-foreground">
      <Link to={`/recap?week=${week}`} onClick={markSeen} className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="eyebrow block opacity-80">Your week in review</span>
          <span className="block truncate font-semibold">{summary || 'See how last week went'}</span>
        </span>
        <ChevronRight size={20} className="shrink-0" />
      </Link>
      <button type="button" onClick={markSeen} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full opacity-80 hover:opacity-100" aria-label="Dismiss recap">
        <X size={18} />
      </button>
    </div>
  )
}
