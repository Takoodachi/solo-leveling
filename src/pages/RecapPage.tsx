import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { useNow } from '@/hooks/useNow'
import { toDateStr, weekDates } from '@/lib/date'
import { buildRecap, lastWeekStart, type WeekRecap } from '@/features/recap/recap'
import RecapStats from '@/features/recap/components/RecapStats'
import RecapHighlights from '@/features/recap/components/RecapHighlights'

const arrow = 'flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent disabled:opacity-30'

/** The week in one line, from what actually happened. */
function headline(r: WeekRecap): string {
  if (r.empty) return 'Nothing logged this week.'
  const parts: string[] = []
  if (r.training.workouts > 0) parts.push(`${r.training.workouts} workout${r.training.workouts === 1 ? '' : 's'}`)
  if (r.bests.length > 0) parts.push(`${r.bests.length} new best${r.bests.length === 1 ? '' : 's'}`)
  if (r.steps.total > 0) parts.push(`${r.steps.total.toLocaleString()} steps`)
  if (r.food) parts.push(`${r.food.days} day${r.food.days === 1 ? '' : 's'} of food logged`)
  if (parts.length === 0) return 'A quiet week.'
  return `${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ' and ' : ''}${parts[parts.length - 1]}.`
}

/** `/recap`: a finished week in review (last week by default; `?week=` picks another Monday). */
export default function RecapPage() {
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const thisWeek = weekDates(now)[0]
  const asked = params.get('week') ?? ''
  const week = /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= toDateStr(now) ? weekDates(parseISO(asked))[0] : lastWeekStart(now)
  const recap = useLiveQuery(() => buildRecap(week), [week])
  const current = week === thisWeek
  const elapsedDays = current ? weekDates(now).filter(d => d <= toDateStr(now)).length : 7
  const go = (weeks: number) => setParams({ week: toDateStr(addDays(parseISO(week), weeks * 7)) }, { replace: true })
  const range = `${format(parseISO(week), 'MMM d')} – ${format(addDays(parseISO(week), 6), 'MMM d')}`

  return (
    <FullScreen className="flex flex-col gap-5">
      <PageHeader
        back="/home"
        title="Weekly recap"
        eyebrow={range}
        action={
          <div className="flex">
            <button type="button" className={arrow} onClick={() => go(-1)} aria-label="Week before"><ChevronLeft size={20} /></button>
            <button type="button" className={arrow} onClick={() => go(1)} disabled={current} aria-label="Week after"><ChevronRight size={20} /></button>
          </div>
        }
      />
      {recap && (
        <>
          <div className="rounded-3xl bg-brand-gradient p-5 text-primary-foreground">
            <p className="eyebrow opacity-80">{current ? 'This week so far' : 'Your week'}</p>
            <p className="mt-1 text-xl font-semibold leading-snug">{headline(recap)}</p>
          </div>
          {!recap.empty && (
            <>
              <RecapHighlights recap={recap} />
              <RecapStats recap={recap} elapsedDays={elapsedDays} />
            </>
          )}
        </>
      )}
    </FullScreen>
  )
}
