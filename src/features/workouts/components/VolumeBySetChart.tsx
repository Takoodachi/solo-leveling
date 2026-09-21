import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { WorkoutSetWithExercise } from '@/types'
import { setVolume } from '@/lib/workoutMath'

interface Props {
  sets: WorkoutSetWithExercise[]
}

/** Per-set load (kg × reps), or minutes for time-based sets, in the order they were logged. */
export default function VolumeBySetChart({ sets }: Props) {
  const hasLoad = sets.some(s => setVolume(s) > 0)
  const data = sets.map((s, i) => ({
    n: i + 1,
    value: hasLoad ? setVolume(s) : (s.duration ?? 0),
    name: s.exercise.name,
  }))
  if (data.length < 2) return null

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="setFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical horizontal={false} stroke="hsl(var(--border))" strokeDasharray="2 4" />
          <XAxis dataKey="n" tick={false} axisLine={false} tickLine={false} />
          <YAxis orientation="right" width={40} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
            labelFormatter={(_, p) => (p?.[0]?.payload as { name?: string } | undefined)?.name ?? ''}
            formatter={v => [hasLoad ? `${Number(v).toLocaleString()} kg` : `${v} min`, hasLoad ? 'Volume' : 'Time']}
          />
          <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#setFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
