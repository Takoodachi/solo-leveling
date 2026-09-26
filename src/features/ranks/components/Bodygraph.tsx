import { useId, type ReactNode } from 'react'
import type { RegionRank } from '../computeRanks'
import type { MuscleRegion } from '../standards'
import { TIERS, type Tier } from '../tiers'
import { BACK, CENTER_BACK, CENTER_FRONT, FRONT, MIRROR, VIEWBOX, type Shape } from './bodygraphShapes'

// Wireframe look: outlines in the text colour, faint on dark themes and dark and
// solid on light ones (strengths in index.css); ranked muscles fill with their tier.
const line = (alpha: number | string) => `hsl(var(--foreground) / ${alpha})`
const BODY_LINE = line('var(--body-line)')
const BODY_FILL = line(0.02)
const MUSCLE_LINE = line('var(--muscle-line)')
const MUSCLE_FILL = line(0.05)
/** A ranked muscle's border: its tier colour on dark themes, the text colour on light ones. */
const tierLine = (color: string) => `color-mix(in oklab, ${color} var(--tier-line, 100%), hsl(var(--foreground)))`
const HALVES = [undefined, MIRROR] as const

interface Props {
  regions: RegionRank[]
  selected: MuscleRegion | null
  onSelect: (region: MuscleRegion) => void
}

interface FigureProps extends Props {
  label: string
  shapes: Shape[]
  center: Shape[]
  tierOf: Map<MuscleRegion, Tier>
  gradient: (tier: Tier) => string
}

function Figure({ label, shapes, center, tierOf, gradient, selected, onSelect }: FigureProps) {
  const tier = (s: Shape) => (s.region ? tierOf.get(s.region) : undefined)
  const plain = shapes.filter(s => !tier(s))
  const lit = TIERS.flatMap(t => {
    const own = shapes.filter(s => tier(s)?.key === t.key)
    return own.length ? [{ tier: t, shapes: own }] : []
  })
  const both = (render: () => ReactNode) =>
    HALVES.map(transform => <g key={transform ?? 'left'} transform={transform}>{render()}</g>)

  return (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox={VIEWBOX} className="h-auto w-full max-w-[168px]" role="img" aria-label={`${label} view`}>
        {center.map((s, i) => <path key={i} d={s.d} fill={BODY_FILL} stroke={BODY_LINE} strokeWidth={0.55} />)}
        {both(() => plain.map((s, i) => (
          <path key={i} d={s.d} fill={s.region ? MUSCLE_FILL : BODY_FILL} stroke={s.region ? MUSCLE_LINE : BODY_LINE} strokeWidth={0.55} strokeLinejoin="round" />
        )))}
        {/* One glow filter per tier, not per muscle */}
        {lit.map(({ tier: t, shapes: own }) => (
          <g key={t.key} style={{ filter: `drop-shadow(0 0 2.5px ${t.color}88)` }}>
            {both(() => own.map((s, i) => (
              <path key={i} d={s.d} fill={gradient(t)} stroke={tierLine(t.color)} strokeWidth={0.7} strokeLinejoin="round" />
            )))}
          </g>
        ))}
        <g fill="none" strokeWidth={0.45} strokeLinecap="round" pointerEvents="none">
          {[...center, ...shapes].filter(s => s.detail).map((s, i) => {
            const stroke = tier(s) ? line('var(--detail-line-ranked)') : line('var(--detail-line)')
            return center.includes(s)
              ? <path key={i} d={s.detail} stroke={stroke} />
              : <g key={i}>{both(() => <path d={s.detail} stroke={stroke} />)}</g>
          })}
        </g>
        {selected && both(() => shapes.filter(s => s.region === selected).map((s, i) => (
          <path key={i} d={s.d} fill={line(0.14)} stroke="hsl(var(--foreground))" strokeWidth={1.2} strokeLinejoin="round" pointerEvents="none" />
        )))}
        {/* Tap targets, a little larger than the muscles */}
        {both(() => shapes.filter(s => s.region).map((s, i) => (
          <path key={i} d={s.d} fill="transparent" stroke="transparent" strokeWidth={3} className="cursor-pointer" onClick={() => onSelect(s.region!)} />
        )))}
      </svg>
      <figcaption className="eyebrow text-muted-foreground">{label}</figcaption>
    </figure>
  )
}

/** Front and back anatomy, each muscle lit in its rank's tier colour. Tap a muscle to select it. */
export default function Bodygraph(props: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const tierOf = new Map(props.regions.flatMap(r => (r.rank ? [[r.key, r.rank.tier] as const] : [])))
  const used = TIERS.filter(t => [...tierOf.values()].some(v => v.key === t.key))
  const gradient = (t: Tier) => `url(#${uid}-${t.key})`

  return (
    <div className="flex flex-col gap-3">
      <svg width={0} height={0} className="absolute" aria-hidden="true">
        <defs>
          {used.map(t => (
            <linearGradient key={t.key} id={`${uid}-${t.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={t.color} stopOpacity={0.95} />
              <stop offset="1" stopColor={t.color} stopOpacity={0.55} />
            </linearGradient>
          ))}
        </defs>
      </svg>
      <div className="grid grid-cols-2 gap-2 rounded-3xl bg-[radial-gradient(closest-side,hsl(var(--primary)/0.14),transparent)] py-2">
        <Figure {...props} label="Front" shapes={FRONT} center={CENTER_FRONT} tierOf={tierOf} gradient={gradient} />
        <Figure {...props} label="Back" shapes={BACK} center={CENTER_BACK} tierOf={tierOf} gradient={gradient} />
      </div>
      {/* Tier colour key */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: MUSCLE_LINE, backgroundColor: MUSCLE_FILL }} /> Unranked
        </span>
        <span className="ml-auto">Wood</span>
        <span className="flex h-2.5 w-28 overflow-hidden rounded-full">
          {TIERS.map(t => <span key={t.key} className="flex-1" style={{ backgroundColor: t.color }} />)}
        </span>
        <span>Olympian</span>
      </div>
    </div>
  )
}
