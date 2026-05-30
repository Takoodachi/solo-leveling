import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { formatShortDate } from '@/lib/date'
import type { OneRmPoint } from '@/lib/analytics'

interface Props {
  data: OneRmPoint[]
}

interface TooltipPayload {
  payload: OneRmPoint
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium">{formatShortDate(p.date)}</p>
      <p className="text-foreground">~{p.est1RM} kg est. 1RM</p>
      <p className="text-muted-foreground">from {p.topWeight} × {p.topReps}</p>
    </div>
  )
}

export default function OneRmChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-8">
        No data yet — log a workout for this exercise.
      </p>
    )
  }

  const chartData = data.map(p => ({ ...p, dateLabel: formatShortDate(p.date) }))

  return (
    <div aria-label="Estimated one-rep max progression">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.3 }} />
          <Line
            type="monotone"
            dataKey="est1RM"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
