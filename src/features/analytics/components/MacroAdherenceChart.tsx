import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts'
import { formatShortDate } from '@/lib/date'
import type { MacroDay } from '../hooks/useAnalyticsData'

interface Props {
  data: MacroDay[]
  targetKcal: number
}

interface TooltipPayload {
  payload: MacroDay
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium">{formatShortDate(p.date)}</p>
      <p className="text-foreground">{p.totalKcal.toLocaleString()} kcal{p.netKcal != null && ' eaten'}</p>
      {p.netKcal != null && (
        <p className="text-foreground">−{p.stepKcal.toLocaleString()} steps = {p.netKcal.toLocaleString()} net</p>
      )}
      <p className="text-muted-foreground">
        P {p.protein}g · C {p.carbs}g · F {p.fat}g
      </p>
    </div>
  )
}

export default function MacroAdherenceChart({ data, targetKcal }: Props) {
  const chartData = data.map(p => ({ ...p, dateLabel: formatShortDate(p.date) }))
  const tickInterval = data.length > 14 ? Math.ceil(data.length / 7) - 1 : 0
  const hasNet = data.some(p => p.netKcal != null)

  return (
    <div aria-label="Macro adherence">
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          {/* Same palette as the MacroBar rows on Home: protein = accent, carbs = sky, fat = amber */}
          <Bar dataKey="proteinKcal" stackId="kcal" fill="hsl(var(--primary))" />
          <Bar dataKey="carbsKcal"   stackId="kcal" fill="#38bdf8" />
          <Bar dataKey="fatKcal"     stackId="kcal" fill="#fcd34d" radius={[4, 4, 0, 0]} />
          {/* Net after steps: a dot per day, no line (days are independent) */}
          {hasNet && (
            <Line
              dataKey="netKcal"
              stroke="none"
              dot={{ r: 4, fill: 'hsl(var(--foreground))', stroke: 'hsl(var(--card))', strokeWidth: 2 }}
              activeDot={false}
              isAnimationActive={false}
            />
          )}
          <ReferenceLine
            y={targetKcal}
            stroke="hsl(var(--foreground))"
            strokeDasharray="4 4"
            label={{
              value: `${targetKcal} kcal`,
              position: 'insideTopRight',
              fontSize: 10,
              fill: 'hsl(var(--foreground))',
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary" /> Protein</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-400" /> Carbs</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-300" /> Fat</span>
        {hasNet && <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-foreground" /> Net after steps</span>}
      </div>
    </div>
  )
}
