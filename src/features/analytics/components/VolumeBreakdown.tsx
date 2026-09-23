import { cn } from '@/lib/utils'
import { STATUS, formatSets, type VolumeMuscle } from '../volume'
import type { RadarAxis } from './VolumeRadar'

interface Props {
  axes: (RadarAxis & { name: string })[]
  active: VolumeMuscle | null
  onActive: (key: VolumeMuscle | null) => void
}

/** One row per muscle: sets, status, and where they sit between MEV, MAV and MRV. */
export default function VolumeBreakdown({ axes, active, onActive }: Props) {
  return (
    <ul className="flex flex-col">
      {axes.map(a => {
        const scale = Math.max(a.t.mrv, a.sets) * 1.1
        const pct = (v: number) => `${(Math.min(v, scale) / scale) * 100}%`
        const zones = [
          { from: 0, to: a.t.mev, color: STATUS.below.color },
          { from: a.t.mev, to: a.t.mavLow, color: STATUS.growing.color },
          { from: a.t.mavLow, to: a.t.mavHigh, color: STATUS.sweet.color },
          { from: a.t.mavHigh, to: a.t.mrv, color: STATUS.over.color },
        ]
        const s = STATUS[a.status]
        return (
          <li key={a.key}>
            <button
              type="button"
              onClick={() => onActive(a.key === active ? null : a.key)}
              className={cn('flex w-full flex-col gap-1.5 rounded-2xl px-2 py-2.5 text-left', a.key === active && 'bg-white/5')}
            >
              <span className="flex w-full items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.name}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">{formatSets(a.sets)} sets</span>
              </span>
              <span className="relative block h-2 w-full overflow-hidden rounded-full bg-secondary">
                {zones.map((z, i) => (
                  <span
                    key={i}
                    className="absolute inset-y-0 opacity-35"
                    style={{ left: pct(z.from), width: `calc(${pct(z.to)} - ${pct(z.from)})`, backgroundColor: z.color }}
                  />
                ))}
                <span
                  className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-foreground shadow-[0_0_0_2px_hsl(var(--card))]"
                  style={{ left: `clamp(2px, ${pct(a.sets)}, calc(100% - 2px))` }}
                />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
