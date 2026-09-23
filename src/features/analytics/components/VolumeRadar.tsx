import { STATUS, formatSets, type Thresholds, type VolumeMuscle, type VolumeStatus } from '../volume'

export interface RadarAxis {
  key: VolumeMuscle
  label: string
  sets: number
  t: Thresholds
  status: VolumeStatus
}

interface Props {
  axes: RadarAxis[]
  active: VolumeMuscle | null
  onActive: (key: VolumeMuscle | null) => void
}

const W = 360
const H = 316
const CX = W / 2
const CY = 158
const R = 102

/** Weekly sets per muscle on a shared scale, over the MEV / MAV / MRV zones for each muscle. */
export default function VolumeRadar({ axes, active, onActive }: Props) {
  const n = axes.length
  // The outer edge is the highest MRV shown (or a bigger week), so nothing is wasted beyond it.
  const max = Math.max(5, ...axes.map(a => Math.max(a.t.mrv, a.sets)))
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n
  const at = (i: number, v: number, extra = 0): [number, number] => {
    const r = (R * Math.min(v, max)) / max + extra
    return [CX + r * Math.cos(angle(i)), CY + r * Math.sin(angle(i))]
  }
  const poly = (vals: number[]) => vals.map((v, i) => at(i, v).map(c => c.toFixed(1)).join(',')).join(' ')
  const ring = (outer: number[], inner: number[] | null) =>
    `M${poly(outer)}Z` + (inner ? `M${poly(inner)}Z` : '')
  const of = (k: keyof Thresholds) => axes.map(a => a.t[k])
  const rings = [...Array.from({ length: Math.ceil(max / 5) - 1 }, (_, i) => (i + 1) * 5), max]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" role="img" aria-label="Weekly sets per muscle">
      {/* Grid */}
      <g fill="none" stroke="hsl(var(--border))" strokeWidth={0.75}>
        {rings.map(v => <polygon key={v} points={poly(axes.map(() => v))} />)}
        {axes.map((a, i) => {
          const [x, y] = at(i, max)
          return <line key={a.key} x1={CX} y1={CY} x2={x} y2={y} stroke={a.key === active ? 'hsl(var(--foreground) / 0.6)' : undefined} />
        })}
      </g>
      {/* Ring values, between the first two spokes */}
      {rings.slice(0, -1).map(v => {
        const r = (R * v) / max
        const a = angle(0.5)
        return (
          <text key={v} x={CX + r * Math.cos(a)} y={CY + r * Math.sin(a) + 3} textAnchor="middle" fontSize={7.5} fill="hsl(var(--muted-foreground))" opacity={0.75}>
            {v}
          </text>
        )
      })}

      {/* Zones, inside out: below MEV, growing, sweet spot, overreaching (up to MRV) */}
      <g fillRule="evenodd">
        <path d={ring(of('mev'), null)} fill={STATUS.below.color} fillOpacity={0.1} />
        <path d={ring(of('mavLow'), of('mev'))} fill={STATUS.growing.color} fillOpacity={0.1} />
        <path d={ring(of('mavHigh'), of('mavLow'))} fill={STATUS.sweet.color} fillOpacity={0.16} stroke={STATUS.sweet.color} strokeOpacity={0.45} strokeWidth={0.75} />
        <path d={ring(of('mrv'), of('mavHigh'))} fill={STATUS.over.color} fillOpacity={0.08} />
        <polygon points={poly(of('mrv'))} fill="none" stroke={STATUS.over.color} strokeOpacity={0.6} strokeWidth={0.75} strokeDasharray="3 3" />
      </g>

      {/* This week */}
      <polygon
        points={poly(axes.map(a => a.sets))}
        fill="hsl(var(--foreground))"
        fillOpacity={0.12}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      {axes.map((a, i) => {
        const [x, y] = at(i, a.sets)
        return <circle key={a.key} cx={x} cy={y} r={a.key === active ? 6 : 4.5} fill={STATUS[a.status].color} stroke="hsl(var(--card))" strokeWidth={2} />
      })}

      {/* Labels (also the tap targets) */}
      {axes.map((a, i) => {
        const [x, y] = at(i, max, 10)
        const cos = Math.cos(angle(i))
        const sin = Math.sin(angle(i))
        const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end'
        const top = sin < -0.3 ? y - 22 : sin > 0.3 ? y + 2 : y - 11
        const dim = active && a.key !== active
        return (
          <g
            key={a.key}
            onClick={() => onActive(a.key === active ? null : a.key)}
            className="cursor-pointer"
            opacity={dim ? 0.45 : 1}
          >
            <circle cx={x} cy={top + 11} r={24} fill="transparent" />
            <text x={x} y={top + 11} textAnchor={anchor} fontSize={13.5} fontWeight={700} fill="hsl(var(--foreground))">{formatSets(a.sets)}</text>
            <text x={x} y={top + 22.5} textAnchor={anchor} fontSize={9} fontWeight={600} letterSpacing="0.04em" fill="hsl(var(--muted-foreground))">
              {a.label.toUpperCase()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
