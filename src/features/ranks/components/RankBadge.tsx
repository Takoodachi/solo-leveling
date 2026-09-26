import { cn } from '@/lib/utils'
import type { TierKey } from '../tiers'
import { BADGES, type Layer, type Palette } from './badgeArt'

interface Props {
  tier: TierKey
  size?: number
  /** Unranked: greyed-out silhouette. */
  locked?: boolean
  className?: string
}

const MIRROR = 'translate(100 0) scale(-1 1)'

/**
 * Halo for the glowing tiers. Strengths come from index.css: dark themes keep a soft
 * glow; light themes add a wider outer halo so it still shows on a pale background.
 */
const glowFilter = (color: string, size: number) =>
  `drop-shadow(0 0 ${size / 9}px color-mix(in srgb, ${color} var(--badge-glow, 60%), transparent)) ` +
  `drop-shadow(0 0 ${size / 4.5}px color-mix(in srgb, ${color} var(--badge-glow-outer, 0%), transparent))`

function Piece({ layer: l, pal }: { layer: Layer; pal: Palette }) {
  const paint = (tone: Layer['fill']) => (!tone || tone === 'none' ? 'none' : pal[tone])
  const common = {
    stroke: l.stroke === undefined ? pal.rim : paint(l.stroke),
    strokeWidth: l.w ?? 1.2,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
    opacity: l.o,
  }
  return (
    <>
      <path d={l.d} fill={paint(l.fill)} {...common} />
      {l.mirror && <path d={l.d} fill={paint(l.fillR ?? l.fill)} transform={MIRROR} {...common} />}
    </>
  )
}

/** Tier emblem: a different helmet per tier, from a plain nasal helm to a winged, haloed divine helm. */
export default function RankBadge({ tier, size = 48, locked = false, className }: Props) {
  const { pal, layers } = BADGES[tier]
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
      {layers.map((l, i) => <Piece key={i} layer={l} pal={pal} />)}
    </svg>
  )
}
