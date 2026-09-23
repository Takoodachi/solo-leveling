import type { RegionRank } from '../computeRanks'
import type { MuscleRegion } from '../standards'
import { TIERS } from '../tiers'
import { AB_LINES, BACK, CENTER_PARTS, FRONT, MIRROR, type Shape } from './bodygraphShapes'

const BODY = '#27272a'
const UNRANKED = '#3f3f46'
const GAP = 'hsl(var(--background))'

interface Props {
  regions: RegionRank[]
  selected: MuscleRegion | null
  onSelect: (region: MuscleRegion) => void
}

function ShapeEl({ shape, fill, onClick }: { shape: Shape; fill: string; onClick?: () => void }) {
  const common = { fill, stroke: GAP, strokeWidth: 1.4, strokeLinejoin: 'round' as const, onClick, className: onClick ? 'cursor-pointer' : undefined }
  if (shape.ellipse) {
    const [cx, cy, rx, ry] = shape.ellipse
    return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...common} />
  }
  return <polygon points={shape.points} {...common} />
}

function Figure({ shapes, label, regions, selected, onSelect }: Props & { shapes: Shape[]; label: string }) {
  const rankOf = new Map(regions.map(r => [r.key, r.rank]))
  const fillFor = (s: Shape) => (s.region ? rankOf.get(s.region)?.tier.color ?? UNRANKED : BODY)
  const half = (
    <>
      {shapes.map((s, i) => (
        <ShapeEl key={i} shape={s} fill={fillFor(s)} onClick={s.region ? () => onSelect(s.region!) : undefined} />
      ))}
    </>
  )
  const outline = shapes.filter(s => s.region && s.region === selected)

  return (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 160 300" className="h-auto w-full max-w-[170px]" role="img" aria-label={`${label} view`}>
        {CENTER_PARTS.map((s, i) => <ShapeEl key={i} shape={s} fill={BODY} />)}
        <g>{half}</g>
        <g transform={MIRROR}>{half}</g>
        {label === 'Front' && <path d={AB_LINES} stroke={GAP} strokeWidth={1.2} fill="none" pointerEvents="none" />}
        {outline.map((s, i) => (
          <g key={i} pointerEvents="none">
            <polygon points={s.points} fill="none" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
            <polygon points={s.points} transform={MIRROR} fill="none" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
          </g>
        ))}
      </svg>
      <figcaption className="eyebrow text-muted-foreground">{label}</figcaption>
    </figure>
  )
}

/** Front and back figures, each muscle painted with its rank's tier colour. Tap a muscle to select it. */
export default function Bodygraph(props: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Figure {...props} shapes={FRONT} label="Front" />
        <Figure {...props} shapes={BACK} label="Back" />
      </div>
      {/* Tier colour key */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: UNRANKED }} /> Unranked</span>
        <span className="ml-auto">Wood</span>
        <span className="flex h-2.5 w-28 overflow-hidden rounded-full">
          {TIERS.map(t => <span key={t.key} className="flex-1" style={{ backgroundColor: t.color }} />)}
        </span>
        <span>Olympian</span>
      </div>
    </div>
  )
}
