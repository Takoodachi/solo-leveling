import { format, parseISO } from 'date-fns'
import { ResponsiveContainer, AreaChart, Area, XAxis, CartesianGrid, Tooltip } from 'recharts'
import type { DaySummary } from '../hooks/useWeekSummary'

interface Props {
  days: DaySummary[]
  today: string
}

/**
 * Two-series weekly chart in the style of the design's "Heart Rate & Sleep"
 * card. A web app can't read heart rate or sleep, so this compares training
 * volume with calories — each normalized to its own weekly peak.
 */
export default function WeeklyOverviewCard({ days, today }: Props) {
  const maxVol = Math.max(1, ...days.map(d => d.volume))
  const maxKcal = Math.max(1, ...days.map(d => d.kcal))
  const data = days.map(d => ({
    day: format(parseISO(d.date), 'EEE'),
    volume: d.volume / maxVol,
    kcal: d.kcal / maxKcal,
    raw: d,
    isToday: d.date === today,
  }))

  return (
    <div className="rounded-3xl bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Training & Nutrition</p>
          <p className="text-sm text-muted-foreground">Weekly overview</p>
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />Volume</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-muted-foreground" />Calories</span>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="wkVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="wkKcal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
            <XAxis dataKey="day" interval={0} padding={{ left: 12, right: 12 }} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={6} />
            <Tooltip
              cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }}
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
              formatter={(_, key, item) => {
                const raw = (item.payload as { raw: DaySummary }).raw
                return key === 'volume'
                  ? [`${Math.round(raw.volume).toLocaleString()} kg`, 'Volume']
                  : [`${Math.round(raw.kcal).toLocaleString()} kcal`, 'Calories']
              }}
            />
            <Area type="monotone" dataKey="kcal" stroke="hsl(var(--muted-foreground))" strokeWidth={2} fill="url(#wkKcal)" dot={false} />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="url(#wkVol)"
              dot={props => {
                const { cx, cy, payload, index } = props as { cx: number; cy: number; payload: { isToday: boolean }; index: number }
                return payload.isToday
                  ? <circle key={index} cx={cx} cy={cy} r={6} fill="hsl(var(--primary))" stroke="white" strokeWidth={2} />
                  : <g key={index} />
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
