import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import Segmented from '@/components/Segmented'
import { useNow } from '@/hooks/useNow'
import { toDateStr } from '@/lib/date'
import { buildRecap } from '@/features/recap/recap'
import { headline } from '@/features/recap/headline'
import { defaultStart, isRecapPeriod, periodLabel, periodStart, PERIODS, shiftPeriod, type RecapPeriod } from '@/features/recap/period'
import RecapStats from '@/features/recap/components/RecapStats'
import RecapHighlights from '@/features/recap/components/RecapHighlights'
import ShareRecapButton from '@/features/recap/components/ShareRecapButton'

const arrow = 'flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent disabled:opacity-30'
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * `/recap`: a week, month or year in review. Opens on the last finished week by default;
 * `?period=month|year` and `?start=YYYY-MM-DD` pick another (old `?week=` links still work).
 */
export default function RecapPage() {
  const now = useNow()
  const today = toDateStr(now)
  const [params, setParams] = useSearchParams()
  const asked = params.get('period')
  const period: RecapPeriod = isRecapPeriod(asked) ? asked : 'week'
  const askedStart = params.get('start') ?? params.get('week') ?? ''
  const start = ISO_DAY.test(askedStart) && askedStart <= today ? periodStart(period, parseISO(askedStart)) : defaultStart(period, now)

  const recap = useLiveQuery(() => buildRecap(period, start), [period, start])
  const current = start === periodStart(period, now)
  // Days so far, counted from the first one with anything logged
  const elapsedDays = recap ? recap.dates.filter(d => d >= recap.since && d <= today).length : 0
  const title = PERIODS.find(p => p.value === period)?.title ?? 'Recap'
  const show = (p: RecapPeriod, s: string) => setParams({ period: p, start: s }, { replace: true })

  return (
    <FullScreen className="flex flex-col gap-5">
      <PageHeader
        back="/home"
        title={title}
        eyebrow={periodLabel(period, start)}
        action={
          <div className="flex">
            <button type="button" className={arrow} onClick={() => show(period, shiftPeriod(period, start, -1))} aria-label={`${period} before`}><ChevronLeft size={20} /></button>
            <button type="button" className={arrow} onClick={() => show(period, shiftPeriod(period, start, 1))} disabled={current} aria-label={`${period} after`}><ChevronRight size={20} /></button>
          </div>
        }
      />
      <Segmented value={period} options={PERIODS} onChange={p => show(p, defaultStart(p, now))} />
      {recap && (
        <>
          <div className="rounded-3xl bg-brand-gradient p-5 text-primary-foreground">
            <p className="eyebrow opacity-80">{current ? `This ${period} so far` : `Your ${period}`}</p>
            <p className="mt-1 text-xl font-semibold leading-snug">{headline(recap)}</p>
          </div>
          {!recap.empty && (
            <>
              <ShareRecapButton recap={recap} current={current} />
              <RecapHighlights recap={recap} />
              <RecapStats recap={recap} elapsedDays={elapsedDays} finished={!current} />
            </>
          )}
        </>
      )}
    </FullScreen>
  )
}
