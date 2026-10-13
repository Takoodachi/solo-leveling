import { cn } from '@/lib/utils'
import type { RankInfo, TierKey } from '../tiers'
import { BADGES, HELM_OVER_GEMS, divisionGems, toneColor, type Layer, type Palette } from './badgeArt'

interface Props {
  tier: TierKey
  /** The division within the tier: its gems go under the helm. Left out, the emblem stands for the tier as a whole. */
  division?: RankInfo['division']
  size?: number
  /** Unranked: greyed-out silhouette. */
  locked?: boolean
  className?: string
}

const MIRROR = 'translate(100 0) scale(-1 1)'
// Smaller than this, gems would be specks, and the helm is better at its full size
const GEMS_FROM = 34

/**
 * Halo for the glowing tiers. Strengths come from index.css: dark themes keep a soft
 * glow; light themes add a wider outer halo so it still shows on a pale background.
 */
const glowFilter = (color: string, size: number) =>
  `drop-shadow(0 0 ${size / 9}px color-mix(in srgb, ${color} var(--badge-glow, 60%), transparent)) ` +
  `drop-shadow(0 0 ${size / 4.5}px color-mix(in srgb, ${color} var(--badge-glow-outer, 0%), transparent))`

function Piece({ layer: l, pal }: { layer: Layer; pal: Palette }) {
  const common = {
    stroke: l.stroke === undefined ? pal.rim : toneColor(pal, l.stroke),
    strokeWidth: l.w ?? 1.2,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
    opacity: l.o,
  }
  return (
    <>
      <path d={l.d} fill={toneColor(pal, l.fill)} {...common} />
      {l.mirror && <path d={l.d} fill={toneColor(pal, l.fillR ?? l.fill)} transform={MIRROR} {...common} />}
    </>
  )
}

/** Rank emblem: a different helmet per tier, from a plain nasal helm to a winged, haloed sun helm, over one to three gems for the division. */
export default function RankBadge({ tier, division, size = 48, locked = false, className }: Props) {
  const { pal, layers } = BADGES[tier]
  const gems = locked || size < GEMS_FROM ? [] : divisionGems(tier, division)
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
      className={cn('shrink-0 overflow-visible', locked && 'opacity-35 grayscale', className)}
      style={pal.glow && !locked && size >= 40 ? { filter: glowFilter(pal.glow, size) } : undefined}
    >
      <g transform={gems.length ? HELM_OVER_GEMS : undefined}>
        {layers.map((l, i) => <Piece key={i} layer={l} pal={pal} />)}
      </g>
      {gems.map((g, i) => <path key={i} d={g.d} fill={g.fill} stroke={g.stroke ?? 'none'} strokeWidth={1.2} strokeLinejoin="round" opacity={g.o} />)}
    </svg>
  )
}
