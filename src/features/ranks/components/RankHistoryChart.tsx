import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { formatShortDate } from '@/lib/date'
import ChartCard from '@/features/analytics/components/ChartCard'
import { tooltipStyle, axisTick } from '@/features/analytics/chartStyles'
import { rankHistory } from '../computeRanks'
import { MUSCLE_GROUPS, type MuscleGroup } from '../standards'
import { TIERS, rankFor } from '../tiers'

const WEEKS = 12
type Series = 'overall' | MuscleGroup | 'running'
const SERIES: { key: Series; label: string }[] = [
  { key: 'overall', label: 'Overall' },
  ...MUSCLE_GROUPS.map(g => ({ key: g.key, label: g.label })),
  { key: 'running', label: 'Running' },
]

/** Weekly rating (overall, one muscle group or running), with the y-axis marked in tiers. */
export default function RankHistoryChart() {
  const history = useLiveQuery(() => rankHistory(WEEKS), [])
  const [series, setSeries] = useState<Series>('overall')

  const data = (history ?? []).map(p => ({
    label: formatShortDate(p.date),
    value: series === 'overall' ? p.overall : series === 'running' ? p.running : p.groups[series],
  }))
  const values = data.flatMap(d => (d.value != null ? [d.value] : []))
  // Zoom to the tiers the line actually crosses, so progress within a tier is visible.
  const lo = values.length ? Math.max(0, Math.floor((Math.min(...values) - 50) / 100) * 100) : 0
  const hi = values.length ? Math.min(1000, Math.ceil((Math.max(...values) + 50) / 100) * 100) : 1000
  const ticks = TIERS.map(t => t.min).filter(v => v >= lo && v <= hi)

  return (
    <ChartCard title="Rank progress" subtitle={`Rating at the end of each week · last ${WEEKS} weeks`}>
      <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
        {SERIES.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSeries(s.key)}
            className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-medium ${s.key === series ? 'bg-foreground text-background' : 'bg-secondary text-foreground/80'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {values.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {series === 'overall'
            ? 'Your overall rank will chart here once three muscle groups are ranked.'
            : series === 'running' ? 'Log a run of 5 km or more to start this line.' : 'Rank a lift in this group to start its line.'}
        </p>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                domain={[lo, hi]}
                ticks={ticks}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={62}
                tickFormatter={v => TIERS.find(t => t.min === v)?.name ?? String(v)}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={l => `Week ending ${l}`}
                formatter={v => {
                  const n = Number(v)
                  return [`${n} pts · ${rankFor(n).label}`, SERIES.find(s => s.key === series)?.label ?? '']
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
