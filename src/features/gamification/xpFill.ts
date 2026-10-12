import type { CSSProperties } from 'react'

/**
 * The style of the XP bar's fill, `percent` of the way to the next level (`.bar-fill`): it
 * comes up out of a faint start, and its tip moves through the theme's own gradient as the
 * level fills. The bar is the shape it always was; only its colouring changed.
 */
export function xpFill(percent: number): CSSProperties {
  const tip = `color-mix(in srgb, hsl(var(--brand-from)) ${Math.round(100 - percent)}%, hsl(var(--brand-to)))`
  return { width: `${percent}%`, '--from': 'hsl(var(--brand-from) / 0.35)', '--to': tip } as CSSProperties
}
