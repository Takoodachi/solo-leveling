import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { formatShortDate } from '@/lib/date'
import Segmented from '@/components/Segmented'
import ChartCard from '@/features/analytics/components/ChartCard'
import { tooltipStyle, axisTick } from '@/features/analytics/chartStyles'
import { TIERS, rankFor } from '@/features/ranks/tiers'
import type { LeaderboardSnapshot } from '../types'

type Series = 'o' | 'r'
const OPTIONS = [{ value: 'o' as const, label: 'Strength' }, { value: 'r' as const, label: 'Running' }]
const THEM = 'hsl(var(--primary))'
const YOU = 'hsl(var(--foreground) / 0.7)'

interface Props {
  them: LeaderboardSnapshot
  name: string
  /** Your snapshot, to draw alongside; omit on your own profile. */
  me?: LeaderboardSnapshot
}

/** Weekly strength or running rating over the last 12 weeks, theirs against yours. */
export default function CompareChart({ them, name, me }: Props) {
  const [series, setSeries] = useState<Series>('o')
  const dates = [...new Set([...(them.history ?? []), ...(me?.history ?? [])].map(p => p.d))].sort()
  const at = (s: LeaderboardSnapshot | undefined, d: string) => s?.history?.find(p => p.d === d)?.[series] ?? null
  const data = dates.map(d => ({ label: formatShortDate(d), them: at(them, d), you: at(me, d) }))
  const values = data.flatMap(p => [p.them, p.you]).filter((v): v is number => v != null)
  const lo = values.length ? Math.max(0, Math.floor((Math.min(...values) - 50) / 100) * 100) : 0
  const hi = values.length ? Math.min(1000, Math.ceil((Math.max(...values) + 50) / 100) * 100) : 1000

  return (
    <ChartCard
      title="Progress"
      subtitle="Rating at the end of each week"
      action={<Segmented size="sm" value={series} options={OPTIONS} onChange={setSeries} className="w-36 shrink-0 bg-secondary" />}
    >
      {values.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nothing ranked here yet.</p>
      ) : (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  domain={[lo, hi]}
                  ticks={TIERS.map(t => t.min).filter(v => v >= lo && v <= hi)}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={62}
                  tickFormatter={v => TIERS.find(t => t.min === v)?.name ?? String(v)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, key) => [`${rankFor(Number(v)).label} · ${v} pts`, key === 'you' ? 'You' : name]}
                />
                {me && <Line type="monotone" dataKey="you" stroke={YOU} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls isAnimationActive={false} />}
                <Line type="monotone" dataKey="them" stroke={THEM} strokeWidth={2} dot={{ r: 3.5, fill: THEM, stroke: 'hsl(var(--card))', strokeWidth: 2 }} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {me && (
            <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ backgroundColor: THEM }} /> {name}</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t-2 border-dashed" style={{ borderColor: YOU }} /> You</span>
            </div>
          )}
        </>
      )}
    </ChartCard>
  )
}
