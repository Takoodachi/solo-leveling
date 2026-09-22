import type { TierKey } from '../tiers'

export type GemKind = 'rings' | 'oval' | 'rhombus' | 'shield' | 'facetRhombus' | 'brilliant' | 'ruby'
export type WingKind = 'none' | 'small' | 'medium' | 'large' | 'bat' | 'angel'

export interface BadgeSpec {
  body: [string, string] // hexagon gradient, top → bottom
  rim: string
  gem: [string, string]
  wing: [string, string]
  wings: WingKind
  gemKind: GemKind
  crown?: boolean
  horns?: boolean
  halo?: boolean
  glow?: string
}

export const BADGES: Record<TierKey, BadgeSpec> = {
  wood:     { body: ['#d7924f', '#8b4f22'], rim: '#5a3112', gem: ['#f3be86', '#b36b33'], wing: ['#d7924f', '#8b4f22'], wings: 'none', gemKind: 'rings' },
  bronze:   { body: ['#ecb58f', '#9b5b35'], rim: '#6a391d', gem: ['#ffe1c8', '#c98452'], wing: ['#ecb58f', '#9b5b35'], wings: 'none', gemKind: 'oval' },
  silver:   { body: ['#f5f8fc', '#98a4b4'], rim: '#5d6878', gem: ['#ffffff', '#b9c5d5'], wing: ['#eef2f7', '#a4afbd'], wings: 'small', gemKind: 'rhombus' },
  gold:     { body: ['#ffe487', '#d69812'], rim: '#875600', gem: ['#fff7cf', '#f2b90f'], wing: ['#ffe487', '#d69812'], wings: 'medium', gemKind: 'shield' },
  platinum: { body: ['#b0f7e6', '#2caa91'], rim: '#18695b', gem: ['#ecfffa', '#5fe0c0'], wing: ['#b0f7e6', '#3fbfa4'], wings: 'medium', gemKind: 'facetRhombus', glow: '#62e3c455' },
  diamond:  { body: ['#c3c7ff', '#565ce0'], rim: '#30338f', gem: ['#f1f2ff', '#8f96ff'], wing: ['#c3c7ff', '#6a70ea'], wings: 'large', gemKind: 'brilliant', glow: '#8f96ff66' },
  champion: { body: ['#f4c0ff', '#a348df'], rim: '#62208e', gem: ['#fff0ff', '#e07cff'], wing: ['#f4c0ff', '#b35be8'], wings: 'large', gemKind: 'brilliant', crown: true, glow: '#d68bff66' },
  titan:    { body: ['#ff8585', '#a0141c'], rim: '#40070b', gem: ['#ffd6d6', '#e0262f'], wing: ['#8e1a21', '#2c0609'], wings: 'bat', gemKind: 'ruby', horns: true, glow: '#f2555d66' },
  olympian: { body: ['#eef9ff', '#58b8f0'], rim: '#1c6896', gem: ['#ffffff', '#93ddff'], wing: ['#fff3c4', '#dcae3a'], wings: 'angel', gemKind: 'brilliant', halo: true, glow: '#6fd0ff88' },
}

// 100×100 artboard, hexagon centred at (50, 54).
export const HEX_OUTER = '50,29 71.65,41.5 71.65,66.5 50,79 28.35,66.5 28.35,41.5'
export const HEX_INNER = '50,36 65.59,45 65.59,63 50,72 34.41,63 34.41,45'
export const HEX_GLOSS = 'M34.41,45 L50,36 L65.59,45 L65.59,51 L34.41,51 Z'

/** Left wing; the right one is mirrored. */
export const WING = 'M31,44 C24,35 12,33 3,37 C9,40 13,43 16,45 C9,46 5,48 2,52 C9,53 14,53 18,53 C12,56 9,59 6,64 C13,63 21,61 29,58 Z'
export const WING_LINES = 'M29,49 C22,48 14,48 8,50 M29,54 C22,55 16,57 11,60'
export const BAT_WING = 'M31,45 L22,30 L19,41 L9,29 L10,45 L1,40 L6,55 L15,53 L12,63 L22,58 L29,59 Z'
export const WING_SCALE: Record<WingKind, number> = { none: 0, small: 0.6, medium: 0.82, large: 1, bat: 1, angel: 1.12 }

export const HORN = 'M37,35 C31,27 29,18 33,9 C35,19 40,26 44,31 Z'
export const CROWN = 'M38,32 L41,17 L46,26 L50,12 L54,26 L59,17 L62,32 Z'
export const BOLT = 'M80,3 L64,27 L71,28 L58,47 L78,21 L71,20 Z'

export const GEMS: Record<GemKind, { fill: string; facets?: string }> = {
  rings:        { fill: '', facets: '' }, // drawn as circles
  oval:         { fill: '' },              // drawn as an ellipse
  rhombus:      { fill: 'M50,41 L59,54 L50,67 L41,54 Z', facets: 'M41,54 L59,54 M50,41 L50,67' },
  shield:       { fill: 'M39,46 L61,46 L50,66 Z', facets: 'M44,49 L56,49 L50,60 Z' },
  facetRhombus: { fill: 'M50,39 L61,54 L50,69 L39,54 Z', facets: 'M50,45 L56,54 L50,63 L44,54 Z' },
  brilliant:    { fill: 'M39,49 L44,43 L56,43 L61,49 L50,66 Z', facets: 'M39,49 L61,49 M44,43 L47,49 L50,66 M56,43 L53,49 L50,66' },
  ruby:         { fill: 'M50,43 L59.5,48.5 L59.5,59.5 L50,65 L40.5,59.5 L40.5,48.5 Z', facets: 'M50,43 L50,54 L59.5,59.5 M50,54 L40.5,59.5' },
}
