import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { addDays, format, parseISO, subDays } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DatePicker from '@/components/DatePicker'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'
import { axisTick, tooltipStyle, dayLabel, scrub, lineCursor } from '@/features/analytics/chartStyles'
import { useBodyMetrics } from './useBodyMetrics'
import { today, formatShortDate, toDateStr } from '@/lib/date'
import { goalProjection, weightSlope, withTrend, type GoalProjection } from '@/lib/weightTrend'
import { showKeyboard } from '@/lib/native'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { useNow } from '@/hooks/useNow'
import { useSettings } from '@/features/settings/hooks/useSettings'
import type { WeightUnit } from '@/types'
import { bodyKg, bodyText, bodyWeight, inUnit, useUnits, weeklyChange } from '@/features/settings/units'

/** The pace is read over this many days up to the latest weigh-in. */
const PACE_DAYS = 28

/** "+0.4 kg a week" (in the unit shown), or that it's steady: stated the same way up or down. */
function pace(kgPerWeek: number, unit: WeightUnit): string {
  if (Math.abs(kgPerWeek) < 0.05) return 'Steady'
  return weeklyChange(kgPerWeek, unit)
}

/** Where the trend stands against the goal, said the same way gaining or losing, and when the recent pace gets it there. */
function goalLine({ gapKg, days }: GoalProjection, paced: boolean, unit: WeightUnit, now: Date): string {
  if (days === 0) return 'The trend is right at it.'
  const where = `The trend is ${bodyText(Math.abs(gapKg), unit)} ${gapKg > 0 ? 'below' : 'above'} it`
  if (days == null) return paced ? `${where} and hasn’t been heading toward it lately.` : `${where}.`
  const when = addDays(now, days)
  const weeks = Math.max(1, Math.round(days / 7))
  const eta = weeks <= 16 ? `${weeks} week${weeks > 1 ? 's' : ''}, around ${format(when, 'MMM d')}` : `${Math.round(days / 30.4)} months, around ${format(when, 'MMM yyyy')}`
  return `${where}: at the last 4 weeks’ pace, about ${eta}.`
}

export default function WeightLogPage() {
  const { metrics, logWeight, deleteMetric } = useBodyMetrics(90)
  const unit = useUnits(s => s.weight)
  const goal = useSettings().settings?.goalWeightKg
  const now = useNow()
  const [weight, setWeight] = useState('')
  // The weigh-in reminder opens /analytics/weight?log=1: straight into the field, keyboard up
  const [params] = useSearchParams()
  const field = useRef<HTMLInputElement>(null)
  const fromReminder = params.get('log') === '1'
  useEffect(() => {
    if (!fromReminder) return
    field.current?.focus()
    showKeyboard() // the Android app: a focus without a tap leaves its keyboard down
  }, [fromReminder])
  const [date, setDate] = useState(today())
  const [saving, setSaving] = useState(false)
  useUnsavedChanges('weigh-in', weight.trim() !== '', 'this weigh-in')

  async function handleSave() {
    const kg = bodyKg(Number(weight.replace(',', '.')), unit)
    if (!kg || kg <= 0 || kg > 500) return
    setSaving(true)
    await logWeight(date, kg)
    setSaving(false)
    setWeight('')
  }

  // Oldest first, each weigh-in with the trend at that point
  const points = withTrend([...metrics].sort((a, b) => a.date.localeCompare(b.date)))
  const chartData = points.map(m => ({ date: m.date, label: formatShortDate(m.date), weight: bodyWeight(m.weightKg, unit), trend: bodyWeight(m.trend, unit) }))
  const latest = metrics[0]
  const trendNow = points.at(-1)?.trend
  const since = latest ? toDateStr(subDays(parseISO(latest.date), PACE_DAYS)) : ''
  const slope = weightSlope(points.filter(p => p.date >= since))
  const toGoal = goal != null && trendNow != null ? goalProjection(trendNow, goal, slope) : null

  return (
    <FullScreen className="flex flex-col gap-4">
      <PageHeader back="/analytics" title="Body weight" />

      {latest && (
        <div className="grid grid-cols-2 gap-3 rounded-3xl bg-card p-4">
          <div>
            <p className="text-xs text-muted-foreground">Latest</p>
            <p className="text-3xl font-bold">{bodyWeight(latest.weightKg, unit)} <span className="text-lg font-normal text-muted-foreground">{unit}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatShortDate(latest.date)}</p>
          </div>
          {trendNow != null && points.length > 1 && (
            <div>
              <p className="text-xs text-muted-foreground">Trend</p>
              <p className="text-3xl font-bold">{inUnit(trendNow, unit).toFixed(1)} <span className="text-lg font-normal text-muted-foreground">{unit}</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">{slope != null ? pace(slope * 7, unit) : 'Pace after a week of weigh-ins'}</p>
            </div>
          )}
          {toGoal && goal != null && (
            <p className="col-span-2 border-t border-border pt-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Goal {bodyText(goal, unit)}.</span> {goalLine(toGoal, slope != null, unit, now)}
            </p>
          )}
        </div>
      )}

      {/* Log weight */}
      <div className="flex flex-col gap-3 rounded-3xl bg-card p-4">
        <h2 className="font-semibold">Log weight</h2>
        <div className="grid grid-cols-[3fr_2fr] gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="weight-date">Date</Label>
            <DatePicker id="weight-date" value={date} onChange={setDate} max={today()} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="weight-kg">Weight ({unit})</Label>
            <Input
              id="weight-kg"
              ref={field}
              type="number"
              inputMode="decimal"
              placeholder={unit === 'lb' ? '155.5' : '70.5'}
              value={weight}
              onChange={e => setWeight(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !weight} className="gap-2">
          <Plus size={16} />
          Save
        </Button>
      </div>

      {/* Chart: the weigh-ins as dots, the trend as the line */}
      {chartData.length > 1 && (
        <div className="rounded-3xl bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Weigh-ins and trend</h2>
            <p className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Weigh-in</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full bg-primary" /> Trend</span>
            </p>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={chartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={36} />
              <Tooltip {...scrub} cursor={lineCursor} contentStyle={tooltipStyle} labelFormatter={dayLabel} formatter={(v, key) => [`${v} ${unit}`, key === 'trend' ? 'Trend' : 'Weigh-in']} />
              <Line type="monotone" dataKey="weight" stroke="none" dot={{ r: 2.5, fill: 'hsl(var(--muted-foreground))', strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="trend" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              {/* The goal, dashed; its label on the side facing the weigh-ins, clear of the dates and the top edge */}
              {goal != null && <ReferenceLine y={bodyWeight(goal, unit)} ifOverflow="extendDomain" stroke="hsl(var(--foreground))" strokeDasharray="4 4" label={{ value: `Goal ${bodyText(goal, unit)}`, position: goal < (trendNow ?? goal) ? 'insideBottomRight' : 'insideTopRight', fontSize: 10, fill: 'hsl(var(--foreground))' }} />}
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-muted-foreground">
            The scale swings from day to day with water and food. The trend is the same weigh-ins with those swings smoothed out.
          </p>
        </div>
      )}

      {/* History list */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">History</h2>
        {metrics.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No entries yet</p>
        )}
        {metrics.length > 0 && (
          <div className="rounded-3xl bg-card px-4">
            {metrics.map(m => (
              <div key={m.uuid} className="flex items-center justify-between border-b border-border last:border-0">
                <span className="text-sm">{formatShortDate(m.date)}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{bodyText(m.weightKg, unit)}</span>
                  <button
                    type="button"
                    onClick={() => void deleteMetric(m)}
                    className="-mr-3 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={`Delete ${formatShortDate(m.date)}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FullScreen>
  )
}
