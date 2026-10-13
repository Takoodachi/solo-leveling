import type { RankInfo, TierKey } from '../tiers'
import { BADGES, HELM_OVER_GEMS, divisionGems, toneColor, type Layer, type Palette } from './badgeArt'

const MIRROR = 'translate(100 0) scale(-1 1)'

function paths(l: Layer, pal: Palette): string {
  const stroke = l.stroke === undefined ? pal.rim : toneColor(pal, l.stroke)
  const attrs = `stroke="${stroke}" stroke-width="${l.w ?? 1.2}" stroke-linejoin="round" stroke-linecap="round"${l.o != null ? ` opacity="${l.o}"` : ''}`
  const left = `<path d="${l.d}" fill="${toneColor(pal, l.fill)}" ${attrs}/>`
  return l.mirror ? `${left}<path d="${l.d}" fill="${toneColor(pal, l.fillR ?? l.fill)}" transform="${MIRROR}" ${attrs}/>` : left
}

/**
 * A rank emblem as a standalone SVG image (same drawing rules as RankBadge), for places that
 * can't render React: the recap share card draws it onto a canvas. Glow is left to the caller.
 */
export function badgeImage(tier: TierKey, size: number, division?: RankInfo['division']): Promise<HTMLImageElement> {
  const { pal, layers } = BADGES[tier]
  const helm = layers.map(l => paths(l, pal)).join('')
  const gems = divisionGems(tier, division)
    .map(g => `<path d="${g.d}" fill="${g.fill}" stroke="${g.stroke ?? 'none'}" stroke-width="1.2" stroke-linejoin="round"${g.o != null ? ` opacity="${g.o}"` : ''}/>`)
    .join('')
  // Room around the 100-unit artboard: some emblems reach past it (rays, horns)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 120 120" width="${size}" height="${size}">${gems ? `<g transform="${HELM_OVER_GEMS}">${helm}</g>${gems}` : helm}</svg>`
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Couldn’t draw the rank emblem'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}
