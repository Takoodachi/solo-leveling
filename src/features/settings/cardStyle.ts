import type { CardStyle } from '@/types'

/**
 * How cards are drawn (Settings → Theme → Card style). A style is only CSS: `data-card` on
 * <html>, and the rules for it in index.css restyle everything that is a card (`bg-card`),
 * so no component knows which one is on. The choice syncs with the account
 * (`settings.cardStyle`); the last one used on this device is painted before React renders,
 * like the theme.
 */
export const CARD_STYLES: { id: CardStyle; name: string; blurb: string }[] = [
  { id: 'solid', name: 'Solid', blurb: 'Plain filled cards.' },
  { id: 'glass', name: 'Glass', blurb: 'Frosted, see-through cards over a glow in your theme’s colours, or over your background photo.' },
  { id: 'outline', name: 'Outline', blurb: 'No fill, just a thin line around each card.' },
  { id: 'glow', name: 'Glow', blurb: 'Each card catches a wash of your theme’s colour.' },
  { id: 'bold', name: 'Bold', blurb: 'Thick outlines and hard shadows.' },
]

const KEY = 'solo:cardStyle'

/** A saved value as a style we still have (anything else is the plain one). */
export const cardStyleOf = (id: unknown): CardStyle => CARD_STYLES.find(s => s.id === id)?.id ?? 'solid'

export function applyCardStyle(id: unknown): void {
  const style = cardStyleOf(id)
  if (style === 'solid') delete document.documentElement.dataset.card
  else document.documentElement.dataset.card = style
  try {
    localStorage.setItem(KEY, style)
  } catch {
    // storage unavailable: the synced setting still applies after load
  }
}

/** Paint the style this device last used (before React renders, so cards don't change look as the app opens). */
export function applyCachedCardStyle(): void {
  try {
    applyCardStyle(localStorage.getItem(KEY))
  } catch {
    // storage unavailable: plain cards, until the setting loads
  }
}
