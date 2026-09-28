import { useEffect, useState } from 'react'
import { format, formatDistance, isToday, isYesterday, parseISO } from 'date-fns'
import { useNow } from '@/hooks/useNow'
import type { StepsDiagnosis } from '../healthSteps'

const dayLabel = (date: string) => {
  const d = parseISO(date)
  return isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE')
}

/**
 * Settings → Steps (connected): what Health Connect holds for the last 3 days and which apps
 * wrote it, so "Samsung Health isn't sharing" is visible at a glance. `version` re-reads it.
 */
export default function HealthStepsDiagnosis({ version }: { version: number }) {
  const [data, setData] = useState<StepsDiagnosis | 'error' | null>(null)
  const now = useNow()

  useEffect(() => {
    let live = true
    import('../healthSteps')
      .then(h => h.diagnose())
      .then(d => { if (live) setData(d) })
      .catch(() => { if (live) setData('error') })
    return () => { live = false }
  }, [version])

  if (data === null) return null
  if (data === 'error') return <p className="text-xs text-muted-foreground">Couldn’t read Health Connect’s data.</p>

  const empty = data.sources.length === 0
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-foreground/5 p-3 text-xs">
      <p className="font-semibold uppercase tracking-wider text-muted-foreground">What Health Connect has</p>
      <div className="flex gap-4">
        {data.days.map(d => (
          <div key={d.date} className="flex flex-col">
            <span className="text-muted-foreground">{dayLabel(d.date)}</span>
            <span className="text-sm font-semibold tabular-nums">{d.steps.toLocaleString()}</span>
          </div>
        ))}
      </div>
      {empty ? (
        <p className="text-muted-foreground">
          No steps from any app in the last 3 days, so there’s nothing to import yet. In Samsung Health, open
          Settings → Health Connect, turn it on and allow <b>Steps</b> to be shared. Samsung Health then sends steps
          every so often (opening it speeds that up), and only from the day sharing was turned on.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5 text-muted-foreground">
          {data.sources.map(s => (
            <li key={s.app}>
              From <span className="font-medium text-foreground">{s.app}</span>: {s.steps.toLocaleString()} steps
              {s.lastAt > 0 && `, latest ${s.lastAt >= now.getTime() ? 'just now' : formatDistance(s.lastAt, now, { addSuffix: true })}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
