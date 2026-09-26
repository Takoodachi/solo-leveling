import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { formatShortDate } from '@/lib/date'
import { formatVolume } from '@/lib/workoutMath'
import { useWeeklyVolume, useLiftedExercises, useOneRmHistory } from '../hooks/useTrainingAnalytics'
import { tooltipStyle, axisTick, compactNumber } from '../chartStyles'
import ChartCard from './ChartCard'
import LiftPicker from './LiftPicker'

export function WeeklyVolumeCard() {
  const weeks = useWeeklyVolume(8)
  const total = weeks?.reduce((n, w) => n + w.workouts, 0) ?? 0

  return (
    <ChartCard id="training-volume" title="Training volume" subtitle={`Last 8 weeks · ${total} workouts`}>
      {!weeks || total === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Finish a workout to see your weekly volume.</p>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="volBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} tickFormatter={compactNumber} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--accent))' }}
                contentStyle={tooltipStyle}
                formatter={(v, _k, item) => [`${formatVolume(Number(v))} · ${(item.payload as { workouts: number }).workouts} workouts`, 'Week']}
              />
              <Bar dataKey="volume" fill="url(#volBar)" radius={[8, 8, 8, 8]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

export function OneRmCard() {
  const lifts = useLiftedExercises()
  // Search on Home links here with ?lift=<exercise id>
  const [params] = useSearchParams()
  const [picked, setPicked] = useState<string | null>(() => params.get('lift'))
  const exerciseId = picked && lifts?.some(l => l.exercise.uuid === picked) ? picked : lifts?.[0]?.exercise.uuid
  const points = useOneRmHistory(exerciseId)

  return (
    <ChartCard id="strength-progress" title="Strength progress" subtitle="Best estimated 1RM per session">
      {!lifts || lifts.length === 0 || !exerciseId ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Log weighted sets to track your strength.</p>
      ) : (
        <>
          <LiftPicker lifts={lifts} selectedId={exerciseId} onSelect={setPicked} />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(points ?? []).map(p => ({ ...p, label: formatShortDate(p.date) }))} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={axisTick} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, _k, item) => {
                    const p = item.payload as { topWeight: number; topReps: number }
                    return [`${v} kg (from ${p.topWeight}×${p.topReps})`, 'Est. 1RM']
                  }}
                />
                <Line type="monotone" dataKey="est1RM" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </ChartCard>
  )
}
