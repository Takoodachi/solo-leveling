import { useId, type ReactNode } from 'react'
import { ink } from '@/lib/colors'
import { useRise } from '@/hooks/useRise'
import { tierSpan, type RankInfo } from '../tiers'

// The ring's own drawing space: a square with the emblem in its middle
const BOX = 240
const C = BOX / 2
const R = 102
const WIDTH = 9
// Three quarters of a circle, open at the bottom, with a gap between one division's arc and the next
const START = -135
const SWEEP = 270
const GAP = 9
const TRACK = 'hsl(var(--secondary))'

/** The point `deg` clockwise from the top of the circle of radius `r`. */
function point(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.sin(a), C - r * Math.cos(a)]
}

function arc(from: number, to: number): string {
  const [x0, y0] = point(R, from)
  const [x1, y1] = point(R, to)
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`
}

/** The colour `t` (0–1) of the way from one colour to another. */
const mix = (from: string, to: string, t: number) => `color-mix(in srgb, ${from} ${Math.round((1 - t) * 100)}%, ${to})`

/** A stretch of the fill. A stroke can't run a gradient along a curve, so it is short pieces, each a shade further on. */
function Fill({ from, to, shade }: { from: number; to: number; shade: (t: number) => string }) {
  const count = Math.max(1, Math.ceil((to - from) / 3))
  const step = (to - from) / count
  const [x0, y0] = point(R, from)
  const [x1, y1] = point(R, to)
  return (
    <>
      <circle cx={x0} cy={y0} r={WIDTH / 2} fill={shade(0)} />
      {Array.from({ length: count }, (_, i) => (
        // (each piece runs a touch into the next, or hairlines show between them)
        <path key={i} d={arc(from + i * step, from + (i + 1) * step + (i < count - 1 ? 0.5 : 0))} stroke={shade((i + 0.5) / count)} strokeWidth={WIDTH} fill="none" />
      ))}
      <circle cx={x1} cy={y1} r={WIDTH / 2} fill={shade(1)} />
    </>
  )
}

function Mark({ r, deg, color, children }: { r: number; deg: number; color?: string; children: ReactNode }) {
  const [x, y] = point(r, deg)
  return (
    <text x={x} y={y + 3.5} textAnchor="middle" fontSize={10.5} fontWeight={700} letterSpacing="0.08em" fill={color ?? 'hsl(var(--muted-foreground))'} className="uppercase">
      {children}
    </text>
  )
}

/**
 * The overall rank's progress on the Ranks screen: a ring around the emblem (`children`), open
 * at the bottom, with one arc for each division of the tier: done, under way, still to come.
 * Like the straight bar it replaced here (`TierProgress`, still on Home's card), it names both
 * ends (this tier, the next), is never drawn empty, and its fill brightens toward a glowing
 * tip whose colour moves from this tier's toward the next one's. Olympian, which has no
 * divisions, is one arc to the top of the ladder.
 */
export default function RankRing({ rank, children }: { rank: RankInfo; children: ReactNode }) {
  const { lo, hi, next, divisions } = tierSpan(rank)
  const arcs = Math.max(1, divisions.length)
  const length = (SWEEP - GAP * (arcs - 1)) / arcs
  // A little is always filled: right after a rank-up an empty ring reads as "nothing done"
  const done = Math.min(1, Math.max(0.04, (rank.rating - lo) / (hi - lo)))
  const color = rank.tier.color
  const faint = mix(color, TRACK, 0.65)
  const tip = mix(color, next?.color ?? `color-mix(in srgb, ${color} 55%, hsl(var(--foreground)))`, done)
  // How far round the fill has got, in degrees from where the ring starts (the gaps count)
  const current = Math.min(arcs - 1, Math.floor(done * arcs))
  const reach = current * (length + GAP) + length * (done * arcs - current)
  const id = `ring-${useId().replace(/\W/g, '')}`
  const rise = useRise('tier-ring', 'arc')
  const riseTip = useRise('tier-ring', 'turn')
  const [x, y] = point(R, START)
  const starts = Array.from({ length: arcs }, (_, i) => START + i * (length + GAP))

  return (
    <div
      className="relative"
      style={{ width: BOX, height: BOX }}
      role="progressbar"
      aria-valuemin={lo}
      aria-valuemax={hi}
      aria-valuenow={rank.rating}
      aria-label={`${rank.label}, on the way to ${next?.name ?? 'the top of the ladder'}`}
    >
      <svg viewBox={`0 0 ${BOX} ${BOX}`} width={BOX} height={BOX} className="absolute inset-0 overflow-visible" aria-hidden="true">
        {/* What shows of the fill: one stroke along the whole ring, so filling it and moving it are one number (.ring-arc, useRise) */}
        <mask id={id} maskUnits="userSpaceOnUse" x={-12} y={-12} width={BOX + 24} height={BOX + 24}>
          <path ref={rise} className="ring-arc" d={arc(START, START + SWEEP)} pathLength={1} strokeDasharray={`${reach / SWEEP} 1`} stroke="#fff" strokeWidth={WIDTH + 6} strokeLinecap="round" fill="none" />
        </mask>
        {starts.map((from, i) => (
          <g key={from}>
            <path d={arc(from, from + length)} stroke={TRACK} strokeWidth={WIDTH} strokeLinecap="round" fill="none" />
            {divisions[i] && <Mark r={R + 15} deg={from + length / 2} color={i === current ? ink(color) : undefined}>{divisions[i]}</Mark>}
          </g>
        ))}
        <g mask={`url(#${id})`}>
          {starts.slice(0, current + 1).map((from, i) => {
            const part = Math.min(1, done * arcs - i)
            return <Fill key={from} from={from} to={from + length * part} shade={t => mix(faint, tip, Math.min(1, (i + t * part) / (done * arcs)))} />
          })}
        </g>
        {/* Where you are: the one bright point on the ring, drawn at its start and turned to its place */}
        <g ref={riseTip} className="transition-transform duration-1000 ease-out" style={{ transform: `rotate(${reach}deg)`, transformOrigin: `${C}px ${C}px` }}>
          <circle cx={x} cy={y} r={11} fill="hsl(var(--background) / 0.55)" />
          <circle cx={x} cy={y} r={8} fill={tip} style={{ filter: `drop-shadow(0 0 7px ${tip})` }} />
        </g>
        <Mark r={R + 3} deg={START - 14} color={ink(color)}>{rank.tier.name}</Mark>
        <Mark r={R + 3} deg={START + SWEEP + 14} color={next ? ink(next.color) : undefined}>{next?.name ?? 'Max'}</Mark>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
