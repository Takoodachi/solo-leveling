import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { formatShortDate } from '@/lib/date'
import type { VolumePoint } from '@/lib/analytics'

interface Props {
  data: VolumePoint[]
}

interface TooltipPayload {
  payload: VolumePoint
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
      <p className="text-muted-foreground">{p.volume.toLocaleString()} kg volume</p>
    </div>
  )
}

export default function VolumeLoadChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-8">
        No data yet — log a workout for this exercise.
      </p>
    )
  }

  const chartData = data.map(p => ({ ...p, dateLabel: formatShortDate(p.date) }))

  return (
    <div aria-label="Volume load trend">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="volume-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.3 }} />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#volume-grad)"
            dot={{ r: 2, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
