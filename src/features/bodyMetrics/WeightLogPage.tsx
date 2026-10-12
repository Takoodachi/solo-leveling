import { useState } from 'react'
import { parseISO, subDays } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { axisTick, tooltipStyle, dayLabel } from '@/features/analytics/chartStyles'
import { useBodyMetrics } from './useBodyMetrics'
import { today, formatShortDate, toDateStr } from '@/lib/date'
import { weightSlope, withTrend } from '@/lib/weightTrend'

/** The pace is read over this many days up to the latest weigh-in. */
const PACE_DAYS = 28

/** "+0.4 kg a week", or that it's steady: stated the same way up or down. */
function pace(kgPerWeek: number): string {
  if (Math.abs(kgPerWeek) < 0.05) return 'Steady'
  return `${kgPerWeek > 0 ? '+' : '−'}${Math.abs(kgPerWeek).toFixed(1)} kg a week`
}

export default function WeightLogPage() {
  const { metrics, logWeight, deleteMetric } = useBodyMetrics(90)
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(today())
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const kg = Number(weight)
    if (!kg || kg <= 0 || kg > 500) return
    setSaving(true)
    await logWeight(date, kg)
    setSaving(false)
    setWeight('')
  }

  // Oldest first, each weigh-in with the trend at that point
  const points = withTrend([...metrics].sort((a, b) => a.date.localeCompare(b.date)))
  const chartData = points.map(m => ({ date: m.date, label: formatShortDate(m.date), weight: m.weightKg, trend: m.trend }))
  const latest = metrics[0]
  const trendNow = points.at(-1)?.trend
  const since = latest ? toDateStr(subDays(parseISO(latest.date), PACE_DAYS)) : ''
  const slope = weightSlope(points.filter(p => p.date >= since))

  return (
    <FullScreen className="flex flex-col gap-4">
      <PageHeader back="/analytics" title="Body weight" />

      {latest && (
        <div className="grid grid-cols-2 gap-3 rounded-3xl bg-card p-4">
          <div>
            <p className="text-xs text-muted-foreground">Latest</p>
            <p className="text-3xl font-bold">{latest.weightKg} <span className="text-lg font-normal text-muted-foreground">kg</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatShortDate(latest.date)}</p>
          </div>
          {trendNow != null && points.length > 1 && (
            <div>
              <p className="text-xs text-muted-foreground">Trend</p>
              <p className="text-3xl font-bold">{trendNow.toFixed(1)} <span className="text-lg font-normal text-muted-foreground">kg</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">{slope != null ? pace(slope * 7) : 'Pace after a week of weigh-ins'}</p>
            </div>
          )}
        </div>
      )}

      {/* Log weight */}
      <div className="flex flex-col gap-3 rounded-3xl bg-card p-4">
        <h2 className="font-medium text-sm">Log weight</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="70.5"
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
            <h2 className="font-medium text-sm">Weigh-ins and trend</h2>
            <p className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Weigh-in</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full bg-primary" /> Trend</span>
            </p>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={chartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={36} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={dayLabel} formatter={(v, key) => [`${v} kg`, key === 'trend' ? 'Trend' : 'Weigh-in']} />
              <Line type="monotone" dataKey="weight" stroke="none" dot={{ r: 2.5, fill: 'hsl(var(--muted-foreground))', strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="trend" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-muted-foreground">
            The scale swings from day to day with water and food. The trend is the same weigh-ins with those swings smoothed out.
          </p>
        </div>
      )}

      {/* History list */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">History</h2>
        {metrics.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No entries yet</p>
        )}
        {metrics.map(m => (
          <div key={m.uuid} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm">{formatShortDate(m.date)}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{m.weightKg} kg</span>
              <button
                onClick={() => deleteMetric(m.uuid)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete entry"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </FullScreen>
  )
}
