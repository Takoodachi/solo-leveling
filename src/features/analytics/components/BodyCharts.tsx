import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { formatShortDate } from '@/lib/date'
import { useBodyMetrics } from '@/features/bodyMetrics/useBodyMetrics'
import { useSettings, DEFAULT_STEP_GOAL } from '@/features/settings/hooks/useSettings'
import { useStepsHistory } from '../hooks/useTrainingAnalytics'
import { tooltipStyle, axisTick, compactNumber } from '../chartStyles'
import ChartCard from './ChartCard'

export function WeightTrendCard() {
  const { metrics } = useBodyMetrics(30)
  const data = [...metrics].sort((a, b) => a.date.localeCompare(b.date)).map(m => ({ label: formatShortDate(m.date), weight: m.weightKg }))
  const latest = metrics[0]

  return (
    <ChartCard
      title="Body weight"
      subtitle={latest ? `${latest.weightKg} kg · ${formatShortDate(latest.date)}` : 'Not logged yet'}
      action={
        <Link to="/analytics/weight" className="-mr-2 flex items-center gap-0.5 rounded-full px-2 py-1 text-sm font-semibold text-primary">
          Log <ChevronRight size={16} />
        </Link>
      }
    >
      {data.length > 1 ? (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="wFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} tick={axisTick} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} kg`, 'Weight']} />
              <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#wFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">Log your weight a couple of times to see the trend.</p>
      )}
    </ChartCard>
  )
}

export function StepsCard() {
  const history = useStepsHistory(14)
  const { settings } = useSettings()
  const goal = settings?.dailyStepGoal ?? DEFAULT_STEP_GOAL
  const data = (history ?? []).map(d => ({ ...d, label: formatShortDate(d.date), hit: d.steps >= goal }))
  const logged = data.filter(d => d.steps > 0)
  const avg = logged.length ? Math.round(logged.reduce((n, d) => n + d.steps, 0) / logged.length) : 0

  return (
    <ChartCard title="Steps" subtitle={logged.length ? `Avg ${avg.toLocaleString()} on logged days · last 14 days` : 'Last 14 days'}>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
            <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={compactNumber} />
            <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} contentStyle={tooltipStyle} formatter={v => [Number(v).toLocaleString(), 'Steps']} />
            <Bar dataKey="steps" radius={[6, 6, 6, 6]} maxBarSize={16} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
