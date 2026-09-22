import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { TierKey } from '../tiers'
import { BADGES, BAT_WING, BOLT, CROWN, GEMS, HEX_GLOSS, HEX_INNER, HEX_OUTER, HORN, WING, WING_LINES, WING_SCALE } from './badgeArt'

interface Props {
  tier: TierKey
  size?: number
  /** Unranked: greyed-out silhouette. */
  locked?: boolean
  className?: string
}

const MIRROR = 'translate(100 0) scale(-1 1)'

/** Tier emblem: a hexagon crest that gains wings, crowns and glow as you climb. */
export default function RankBadge({ tier, size = 48, locked = false, className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const s = BADGES[tier]
  const id = (name: string) => `${uid}-${name}`
  const url = (name: string) => `url(#${id(name)})`
  const wingScale = WING_SCALE[s.wings]
  const wingTransform = `translate(31 50) scale(${wingScale}) translate(-31 -50)`
  const gem = GEMS[s.gemKind]

  const wing = s.wings === 'none' ? null : (
    <g transform={wingTransform}>
      <path d={s.wings === 'bat' ? BAT_WING : WING} fill={url('wing')} stroke={s.rim} strokeWidth={1.4} strokeLinejoin="round" />
      {s.wings !== 'bat' && <path d={WING_LINES} fill="none" stroke={s.rim} strokeOpacity={0.45} strokeWidth={1} />}
    </g>
  )

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
      className={cn('shrink-0', locked && 'opacity-35 grayscale', className)}
      style={s.glow && !locked && size >= 40 ? { filter: `drop-shadow(0 0 ${size / 8}px ${s.glow})` } : undefined}
    >
      <defs>
        {(['body', 'gem', 'wing'] as const).map(k => (
          <linearGradient key={k} id={id(k)} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={s[k][0]} />
            <stop offset="1" stopColor={s[k][1]} />
          </linearGradient>
        ))}
        <linearGradient id={id('inner')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.body[1]} />
          <stop offset="1" stopColor={s.body[0]} />
        </linearGradient>
      </defs>

      {s.halo && (
        <>
          <path d={BOLT} fill={url('wing')} stroke={s.rim} strokeWidth={1} strokeLinejoin="round" />
          <ellipse cx={50} cy={17} rx={16} ry={4.5} fill="none" stroke={s.wing[1]} strokeWidth={2.6} />
        </>
      )}
      {s.horns && (
        <>
          <path d={HORN} fill={url('wing')} stroke={s.rim} strokeWidth={1.2} />
          <path d={HORN} transform={MIRROR} fill={url('wing')} stroke={s.rim} strokeWidth={1.2} />
        </>
      )}
      {s.crown && <path d={CROWN} fill={url('gem')} stroke={s.rim} strokeWidth={1.4} strokeLinejoin="round" />}
      {wing}
      {wing && <g transform={MIRROR}>{wing}</g>}

      <polygon points={HEX_OUTER} fill={url('body')} stroke={s.rim} strokeWidth={3} strokeLinejoin="round" />
      <polygon points={HEX_INNER} fill={url('inner')} stroke="#fff" strokeOpacity={0.35} strokeWidth={1.2} strokeLinejoin="round" />
      <path d={HEX_GLOSS} fill="#fff" fillOpacity={0.1} />

      {s.gemKind === 'rings' && (
        <g fill="none" stroke={s.gem[0]} strokeWidth={1.8}>
          <circle cx={50} cy={54} r={10} strokeOpacity={0.8} />
          <circle cx={50} cy={54} r={5.5} />
          <path d="M50,44 L52,51" strokeLinecap="round" />
        </g>
      )}
      {s.gemKind === 'oval' && (
        <>
          <ellipse cx={50} cy={54} rx={7.5} ry={10.5} fill={url('gem')} stroke={s.rim} strokeWidth={1.2} />
          <ellipse cx={47.5} cy={50} rx={2} ry={3.5} fill="#fff" fillOpacity={0.6} />
        </>
      )}
      {gem.fill && <path d={gem.fill} fill={url('gem')} stroke={s.rim} strokeWidth={1.2} strokeLinejoin="round" />}
      {gem.facets && <path d={gem.facets} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1} strokeLinejoin="round" />}
    </svg>
  )
}
