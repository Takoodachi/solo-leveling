/**
 * Colour themes: preset palettes applied as the CSS variables Tailwind reads
 * (index.css / tailwind.config). Values are "H S% L%" triplets.
 *
 * Besides the shadcn tokens, each theme sets:
 * - carbs / fat: macro colours (protein uses primary), picked to stay apart from it
 * - brand-from / brand-to: the accent gradient (avatars, hero cards)
 * - ink: how much of a rank tier's own colour its text keeps; light themes mix
 *   in the foreground so pale tiers (Silver, Gold) stay readable (tierInk)
 */

import { setSystemBarStyle } from '@/lib/native'
import { cleanCustomTheme, customTokens, deriveTokens, parseHsl, type Hsl } from './themeBuilder'

export type ThemeMode = 'dark' | 'light'

type Token =
  | 'background' | 'foreground' | 'card' | 'popover' | 'primary' | 'primary-foreground'
  | 'secondary' | 'muted' | 'muted-foreground' | 'accent' | 'destructive' | 'border' | 'input'
  | 'carbs' | 'fat' | 'brand-from' | 'brand-to'

export type ThemeTokens = Record<Token, string>

export interface Theme {
  id: string
  name: string
  mode: ThemeMode
  vars: Record<string, string>
}

const DARK_MACROS = { carbs: '199 89% 60%', fat: '45 96% 64%' }
const LIGHT_MACROS = { carbs: '200 98% 39%', fat: '32 95% 44%' }

function theme(id: string, name: string, mode: ThemeMode, t: ThemeTokens): Theme {
  const onSurface = t.foreground
  return {
    id,
    name,
    mode,
    vars: {
      ...t,
      'card-foreground': onSurface,
      'popover-foreground': onSurface,
      'secondary-foreground': onSurface,
      'accent-foreground': onSurface,
      'destructive-foreground': '0 0% 100%',
      ring: t.primary,
      ink: mode === 'dark' ? '100%' : '55%',
    },
  }
}

/** A preset made by the builder from its accent, background and gradient end ("H S% L%"). */
function mixed(id: string, name: string, mode: ThemeMode, accent: string, background: string, gradient: string): Theme {
  return theme(id, name, mode, deriveTokens(mode, parseHsl(accent) as Hsl, parseHsl(background) as Hsl, parseHsl(gradient)))
}

export const THEMES: Theme[] = [
  // ── Dark ─────────────────────────────────────────────────────────────
  theme('ember', 'Ember', 'dark', {
    background: '240 5% 4%', foreground: '0 0% 98%', card: '240 4% 9%', popover: '240 4% 10%',
    primary: '18 100% 55%', 'primary-foreground': '0 0% 100%',
    secondary: '240 4% 14%', muted: '240 4% 14%', 'muted-foreground': '240 3% 58%', accent: '240 4% 17%',
    destructive: '2 80% 58%', border: '240 4% 15%', input: '240 4% 18%',
    ...DARK_MACROS, 'brand-from': '24 100% 58%', 'brand-to': '8 88% 52%',
  }),
  theme('monarch', 'Shadow Monarch', 'dark', {
    background: '258 35% 5%', foreground: '250 30% 97%', card: '258 25% 10%', popover: '258 25% 11%',
    primary: '266 85% 64%', 'primary-foreground': '0 0% 100%',
    secondary: '258 20% 15%', muted: '258 20% 15%', 'muted-foreground': '255 12% 64%', accent: '258 20% 19%',
    destructive: '2 80% 58%', border: '258 20% 16%', input: '258 20% 19%',
    ...DARK_MACROS, 'brand-from': '272 95% 70%', 'brand-to': '248 80% 58%',
  }),
  theme('abyss', 'Abyss', 'dark', {
    background: '222 50% 5%', foreground: '210 40% 97%', card: '222 38% 10%', popover: '222 38% 11%',
    primary: '190 95% 50%', 'primary-foreground': '222 50% 7%',
    secondary: '222 30% 15%', muted: '222 30% 15%', 'muted-foreground': '215 18% 64%', accent: '222 30% 19%',
    destructive: '2 80% 60%', border: '222 30% 16%', input: '222 30% 19%',
    carbs: '270 85% 74%', fat: '45 96% 64%', 'brand-from': '185 95% 50%', 'brand-to': '215 95% 58%',
  }),
  theme('verdant', 'Verdant', 'dark', {
    background: '160 35% 4%', foreground: '140 20% 96%', card: '160 25% 8%', popover: '160 25% 9%',
    primary: '150 75% 45%', 'primary-foreground': '160 40% 6%',
    secondary: '160 18% 13%', muted: '160 18% 13%', 'muted-foreground': '150 8% 60%', accent: '160 18% 16%',
    destructive: '2 80% 58%', border: '160 18% 14%', input: '160 18% 17%',
    ...DARK_MACROS, 'brand-from': '140 75% 50%', 'brand-to': '170 80% 38%',
  }),
  theme('bloodmoon', 'Blood Moon', 'dark', {
    background: '350 25% 4%', foreground: '0 10% 97%', card: '350 16% 9%', popover: '350 16% 10%',
    primary: '354 88% 58%', 'primary-foreground': '0 0% 100%',
    secondary: '350 12% 14%', muted: '350 12% 14%', 'muted-foreground': '350 6% 60%', accent: '350 12% 17%',
    destructive: '14 90% 55%', border: '350 12% 15%', input: '350 12% 18%',
    ...DARK_MACROS, 'brand-from': '0 90% 60%', 'brand-to': '338 85% 45%',
  }),
  mixed('gold', 'Midnight Gold', 'dark', '45 95% 54%', '40 30% 4%', '28 95% 52%'),
  mixed('neon', 'Neon', 'dark', '322 92% 62%', '285 40% 5%', '268 90% 62%'),
  mixed('graphite', 'Graphite', 'dark', '217 92% 63%', '220 8% 6%', '240 80% 66%'),
  mixed('volt', 'Volt', 'dark', '82 85% 52%', '90 25% 4%', '150 75% 42%'),
  // ── Light ────────────────────────────────────────────────────────────
  theme('daylight', 'Daylight', 'light', {
    background: '30 25% 96%', foreground: '240 10% 8%', card: '0 0% 100%', popover: '0 0% 100%',
    primary: '18 100% 50%', 'primary-foreground': '0 0% 100%',
    secondary: '30 15% 92%', muted: '30 15% 92%', 'muted-foreground': '240 4% 40%', accent: '30 15% 89%',
    destructive: '0 72% 48%', border: '30 12% 87%', input: '30 12% 84%',
    ...LIGHT_MACROS, 'brand-from': '24 100% 55%', 'brand-to': '8 88% 50%',
  }),
  theme('glacier', 'Glacier', 'light', {
    background: '210 40% 96%', foreground: '222 45% 10%', card: '0 0% 100%', popover: '0 0% 100%',
    primary: '214 90% 50%', 'primary-foreground': '0 0% 100%',
    secondary: '210 32% 92%', muted: '210 32% 92%', 'muted-foreground': '215 15% 40%', accent: '210 32% 89%',
    destructive: '0 72% 48%', border: '210 28% 87%', input: '210 28% 84%',
    carbs: '174 80% 30%', fat: '32 95% 44%', 'brand-from': '199 95% 48%', 'brand-to': '222 90% 55%',
  }),
  theme('matcha', 'Matcha', 'light', {
    background: '100 20% 95%', foreground: '150 30% 9%', card: '0 0% 100%', popover: '0 0% 100%',
    primary: '158 85% 30%', 'primary-foreground': '0 0% 100%',
    secondary: '100 18% 91%', muted: '100 18% 91%', 'muted-foreground': '150 8% 38%', accent: '100 18% 88%',
    destructive: '0 72% 46%', border: '100 15% 85%', input: '100 15% 82%',
    ...LIGHT_MACROS, 'brand-from': '145 70% 38%', 'brand-to': '170 80% 28%',
  }),
  theme('sakura', 'Sakura', 'light', {
    background: '340 60% 97%', foreground: '340 25% 12%', card: '0 0% 100%', popover: '0 0% 100%',
    primary: '336 78% 50%', 'primary-foreground': '0 0% 100%',
    secondary: '340 45% 93%', muted: '340 45% 93%', 'muted-foreground': '340 8% 42%', accent: '340 45% 90%',
    destructive: '0 72% 45%', border: '340 35% 88%', input: '340 35% 85%',
    ...LIGHT_MACROS, 'brand-from': '330 85% 58%', 'brand-to': '350 85% 52%',
  }),
  theme('iris', 'Iris', 'light', {
    background: '250 45% 97%', foreground: '250 30% 12%', card: '0 0% 100%', popover: '0 0% 100%',
    primary: '262 75% 56%', 'primary-foreground': '0 0% 100%',
    secondary: '250 35% 93%', muted: '250 35% 93%', 'muted-foreground': '250 10% 42%', accent: '250 35% 90%',
    destructive: '0 72% 48%', border: '250 30% 88%', input: '250 30% 85%',
    ...LIGHT_MACROS, 'brand-from': '270 80% 62%', 'brand-to': '240 75% 56%',
  }),
  mixed('lagoon', 'Lagoon', 'light', '186 90% 30%', '185 35% 95%', '205 90% 42%'),
  mixed('honey', 'Honey', 'light', '36 95% 40%', '45 55% 95%', '22 90% 48%'),
  mixed('cherry', 'Cherry', 'light', '354 76% 48%', '10 40% 96%', '14 88% 52%'),
  mixed('paper', 'Paper', 'light', '240 6% 20%', '40 12% 95%', '240 5% 38%'),
]

export const DEFAULT_THEME = 'ember'
/** `settings.theme` when the user's own palette (`settings.customTheme`) is the one on screen. */
export const CUSTOM_THEME = 'custom'
const THEME_KEY = 'solo:theme'
const CUSTOM_KEY = 'solo:customTheme'

export function themeById(id: string | undefined | null): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0]
}

/** The user's own palette as a theme; null when there isn't a usable one saved. */
export function customTheme(custom: unknown): Theme | null {
  const clean = cleanCustomTheme(custom)
  return clean && theme(CUSTOM_THEME, 'Custom', clean.mode, customTokens(clean))
}

/** The theme a setting means: a preset, or the custom one when that's chosen and saved. */
export function resolveTheme(id: string | undefined | null, custom?: unknown): Theme {
  return (id === CUSTOM_THEME ? customTheme(custom) : null) ?? themeById(id)
}

/** "H S% L%" → "#rrggbb" (for the browser's theme-color, which wants a plain colour). */
export function hslToHex(hsl: string): string {
  const [h, s, l] = hsl.split(/\s+/).map(v => parseFloat(v))
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

let active: Theme = THEMES[0]

/** The theme on screen right now. */
export const activeTheme = () => active

/**
 * Paint the app in a theme. `remember` keeps it for this device's next launch; a preview (the
 * custom theme while it's being edited) leaves that alone.
 */
export function applyTheme(id: string | undefined | null, custom?: unknown, remember = true): void {
  const t = resolveTheme(id, custom)
  active = t
  const root = document.documentElement
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(`--${k}`, v)
  root.classList.toggle('dark', t.mode === 'dark')
  root.style.colorScheme = t.mode
  root.dataset.theme = t.id
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hslToHex(t.vars.background))
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', t.mode)
  setSystemBarStyle(t.mode)
  if (!remember) return
  try {
    localStorage.setItem(THEME_KEY, t.id)
    if (t.id === CUSTOM_THEME) localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom))
  } catch {
    // storage unavailable: the synced setting still applies after load
  }
}

/** Paint the theme this device last used (before React renders, so there's no flash). */
export function applyCachedTheme(): void {
  let id: string | null = null
  let custom: unknown = null
  try {
    id = localStorage.getItem(THEME_KEY)
    if (id === CUSTOM_THEME) custom = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? 'null')
  } catch {
    // storage unavailable or a broken copy: the default theme, until the setting loads
  }
  applyTheme(id, custom, false)
}
