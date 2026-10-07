import type { CustomTheme } from '@/types'
import type { ThemeMode, ThemeTokens } from './themes'

/**
 * A whole palette from three colours: the accent, the background and (optionally) the far end
 * of the accent gradient. Surfaces step away from the background the way the hand-made themes
 * do, text takes a hint of its hue, and the macro colours move aside when the accent sits on
 * one of them. The newer presets in themes.ts are made with it, and so is the user's own theme.
 */

export type Hsl = [h: number, s: number, l: number]
type Span = [min: number, max: number]

/** What the editor lets each colour be, so a custom theme stays readable in its mode. */
export const CUSTOM_RANGES: Record<ThemeMode, Record<'accent' | 'background', { s: Span; l: Span }>> = {
  dark: { accent: { s: [30, 100], l: [45, 72] }, background: { s: [0, 60], l: [2, 12] } },
  light: { accent: { s: [30, 100], l: [28, 55] }, background: { s: [0, 70], l: [92, 97] } },
}

export const DEFAULT_CUSTOM: CustomTheme = { mode: 'dark', accent: '18 100% 55%', background: '240 5% 4%' }

const clamp = (n: number, [min, max]: Span) => Math.min(max, Math.max(min, n))
const wrap = (h: number) => ((h % 360) + 360) % 360
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
export const hsl = ([h, s, l]: Hsl) => `${Math.round(wrap(h))} ${Math.round(clamp(s, [0, 100]))}% ${Math.round(clamp(l, [0, 100]))}%`

export function parseHsl(value: unknown): Hsl | null {
  const m = typeof value === 'string' ? /^(-?\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(value.trim()) : null
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

/** Relative luminance (WCAG) of an HSL colour. */
function luminance([h, s, l]: Hsl): number {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const channel = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4)
}

/** The tokens of a theme from its accent, background and gradient end. */
export function deriveTokens(mode: ThemeMode, accent: Hsl, background: Hsl, gradient?: Hsl | null): ThemeTokens {
  const [ah, as, al] = accent
  const [bh, bs, bl] = background
  const dark = mode === 'dark'
  const surface = (sat: number, light: number) => hsl([bh, bs * sat, bl + light])
  // White text on the accent unless the accent is too pale to carry it
  const onAccent = 1.05 / (luminance(accent) + 0.05) >= 2.6 ? '0 0% 100%' : hsl([ah, 50, 8])
  return {
    background: hsl(background),
    foreground: dark ? hsl([bh, Math.min(bs, 30), 97]) : hsl([bh, Math.min(bs, 40), 10]),
    card: dark ? surface(0.72, 5) : '0 0% 100%',
    popover: dark ? surface(0.72, 6) : '0 0% 100%',
    primary: hsl(accent),
    'primary-foreground': onAccent,
    secondary: dark ? surface(0.58, 10) : surface(0.8, -4),
    muted: dark ? surface(0.58, 10) : surface(0.8, -4),
    'muted-foreground': dark ? hsl([bh, Math.min(bs * 0.35, 14), 62]) : hsl([bh, Math.min(bs * 0.35, 15), 40]),
    accent: dark ? surface(0.58, 13) : surface(0.8, -7),
    // A red accent gets an orange "danger", so the two don't read as the same thing
    destructive: hueGap(ah, 0) < 20 ? (dark ? '14 90% 55%' : '22 90% 40%') : dark ? '2 80% 58%' : '0 72% 48%',
    border: dark ? surface(0.58, 11) : surface(0.7, -9),
    input: dark ? surface(0.58, 14) : surface(0.7, -12),
    // Protein wears the accent; carbs (blue) and fat (amber) step aside when it lands on them
    carbs: hueGap(ah, 199) < 30 ? (dark ? '270 85% 74%' : '265 70% 55%') : dark ? '199 89% 60%' : '200 98% 39%',
    fat: hueGap(ah, dark ? 45 : 32) < 22 ? (dark ? '340 85% 70%' : '340 75% 48%') : dark ? '45 96% 64%' : '32 95% 44%',
    'brand-from': hsl([ah + (gradient ? 0 : 6), as, al + 3]),
    'brand-to': gradient ? hsl(gradient) : hsl([ah - 10, as - 12, al - 3]),
  }
}

/** A saved custom theme with every colour pulled into its allowed range; null when it isn't one. */
export function cleanCustomTheme(value: unknown): CustomTheme | null {
  const v = value as Partial<CustomTheme> | null | undefined
  if (!v || (v.mode !== 'dark' && v.mode !== 'light')) return null
  const accent = parseHsl(v.accent)
  const background = parseHsl(v.background)
  if (!accent || !background) return null
  const range = CUSTOM_RANGES[v.mode]
  const fit = (c: Hsl, r: { s: Span; l: Span }): Hsl => [wrap(c[0]), clamp(c[1], r.s), clamp(c[2], r.l)]
  const gradient = parseHsl(v.gradient)
  return {
    mode: v.mode,
    accent: hsl(fit(accent, range.accent)),
    background: hsl(fit(background, range.background)),
    ...(gradient ? { gradient: hsl(fit(gradient, range.accent)) } : {}),
  }
}

/** The same theme on the other base: each colour keeps its place within that base's brightness range. */
export function withMode(custom: CustomTheme, mode: ThemeMode): CustomTheme {
  if (custom.mode === mode) return custom
  const from = CUSTOM_RANGES[custom.mode]
  const to = CUSTOM_RANGES[mode]
  const move = (value: string | undefined, part: 'accent' | 'background') => {
    const c = parseHsl(value)
    if (!c) return undefined
    const place = (c[2] - from[part].l[0]) / (from[part].l[1] - from[part].l[0])
    return hsl([c[0], c[1], to[part].l[0] + place * (to[part].l[1] - to[part].l[0])])
  }
  const moved = { mode, accent: move(custom.accent, 'accent'), background: move(custom.background, 'background'), gradient: move(custom.gradient, 'accent') }
  return cleanCustomTheme(moved) ?? custom
}

/** The tokens of a (cleaned) custom theme. */
export function customTokens(custom: CustomTheme): ThemeTokens {
  // cleanCustomTheme has checked these parse
  return deriveTokens(custom.mode, parseHsl(custom.accent) as Hsl, parseHsl(custom.background) as Hsl, parseHsl(custom.gradient))
}
