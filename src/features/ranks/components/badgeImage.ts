import type { TierKey } from '../tiers'
import { BADGES, type Layer, type Palette } from './badgeArt'

const MIRROR = 'translate(100 0) scale(-1 1)'

function paths(l: Layer, pal: Palette): string {
  const paint = (tone: Layer['fill']) => (!tone || tone === 'none' ? 'none' : pal[tone])
  const stroke = l.stroke === undefined ? pal.rim : paint(l.stroke)
  const attrs = `stroke="${stroke}" stroke-width="${l.w ?? 1.2}" stroke-linejoin="round" stroke-linecap="round"${l.o != null ? ` opacity="${l.o}"` : ''}`
  const left = `<path d="${l.d}" fill="${paint(l.fill)}" ${attrs}/>`
  return l.mirror ? `${left}<path d="${l.d}" fill="${paint(l.fillR ?? l.fill)}" transform="${MIRROR}" ${attrs}/>` : left
}

/**
 * A tier emblem as a standalone SVG image (same drawing rules as RankBadge), for places that
 * can't render React: the recap share card draws it onto a canvas. Glow is left to the caller.
 */
export function badgeImage(tier: TierKey, size: number): Promise<HTMLImageElement> {
  const { pal, layers } = BADGES[tier]
  // Room around the 100-unit artboard: some emblems reach past it (rays, horns)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 120 120" width="${size}" height="${size}">${layers.map(l => paths(l, pal)).join('')}</svg>`
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Couldn’t draw the rank emblem'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}
