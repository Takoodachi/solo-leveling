import type { TierKey } from '../tiers'

/**
 * Rank emblems: a different helmet per tier, more elaborate the higher it goes
 * (nasal helm → Corinthian → great helm → plumed centurion → kabuto → winged
 * helm → crowned royal helm → horned demon helm → divine helm).
 *
 * Flat-shaded on a 100×100 artboard. Most shapes are drawn as their left half
 * with `mirror`: the left copy takes `fill` (lit) and the mirrored right copy
 * `fillR` (shaded), which gives the cut-metal look and a centre ridge for free.
 */

export type Tone = 'hi' | 'lt' | 'dk' | 'rim' | 'core' | 'eye' | 'a0' | 'a1' | 'a2'

export interface Palette extends Record<Tone, string> {
  glow?: string
}

export interface Layer {
  d: string
  fill?: Tone | 'none'
  /** Fill of the mirrored (right) copy; defaults to `fill`. */
  fillR?: Tone | 'none'
  mirror?: boolean
  /** Outline tone (default rim) or 'none'. */
  stroke?: Tone | 'none'
  w?: number
  o?: number
}

// ── Path helpers ──────────────────────────────────────────────────────────────
const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0 Z`
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0 Z`

/** Thin rays around (50, 50), as one path. */
function rays(count: number, inner: number, outer: number, halfWidthDeg: number, start = 0): string {
  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180
    return `${(50 + r * Math.sin(a)).toFixed(2)},${(50 - r * Math.cos(a)).toFixed(2)}`
  }
  return Array.from({ length: count }, (_, i) => {
    const deg = start + (360 / count) * i
    return `M${pt(deg - halfWidthDeg, inner)} L${pt(deg, outer)} L${pt(deg + halfWidthDeg, inner)} Z`
  }).join(' ')
}

const shade = { fill: 'lt', fillR: 'dk', mirror: true } as const

// ── Helmets ───────────────────────────────────────────────────────────────────
const WOOD: Layer[] = [
  // Nasal helm: a plain conical cap, a riveted brow band and a nose guard
  { d: 'M31,56 L69,56 L66,70 C60,78 40,78 34,70 Z', fill: 'rim', stroke: 'none' },
  { d: 'M50,22 C41,22 33,30 31,42 L30,50 L50,50 Z', ...shade, w: 2 },
  { d: 'M50,22 C44,22 39,25 36,31 L50,34 Z', fill: 'hi', stroke: 'none', o: 0.6 },
  { d: 'M50,49 L29,49 L29,56.5 L50,56.5 Z', ...shade, w: 1.6 },
  { d: `${circle(35, 52.8, 1.3)} ${circle(42, 52.8, 1.3)}`, fill: 'rim', stroke: 'none', mirror: true },
  { d: 'M47,56 L53,56 L52.5,72 L50,75 L47.5,72 Z', fill: 'lt', w: 1.4 },
]

const BRONZE: Layer[] = [
  // Corinthian: one-piece bronze with almond eyes and a split chin
  { d: 'M50,20 C38,20 29,29 29,43 L29,60 C29,68 34,75 43,80 L46.5,80 L47.5,62 L50,60 Z', ...shade, w: 2.2 },
  { d: 'M50,20 C43,20 37,23 34,28.5 L50,32 Z', fill: 'hi', stroke: 'none', o: 0.7 },
  { d: 'M31,38 C38,33 45,33 50,34 L50,37 C44,36 38,37 31,41 Z', fill: 'hi', fillR: 'lt', mirror: true, stroke: 'none', o: 0.55 },
  { d: 'M31.5,50 C35,58 38.5,66 44.5,74', fill: 'none', mirror: true, w: 1, o: 0.45 },
  { d: 'M31.5,44 C36,37.5 43.5,38 48,44.5 C43.5,50 36,50 31.5,44 Z', fill: 'rim', mirror: true, stroke: 'none' },
  { d: 'M47.5,44 L52.5,44 L51.5,61 L48.5,61 Z', fill: 'lt', w: 1.1 },
]

const SILVER: Layer[] = [
  // Crusader great helm: flat-topped barrel, cross reinforcement, eye slit, breaths
  { d: 'M50,19.5 C42,19.5 35,21 30.5,23 L29,70 C35,74.5 42,76.5 50,77 Z', ...shade, w: 2.2 },
  { d: 'M50,19.5 C42,19.5 35,21 30.5,23 L30.8,28.5 C37,26.5 43,26 50,26 Z', fill: 'hi', fillR: 'lt', mirror: true, stroke: 'none', o: 0.85 },
  { d: 'M47,26 L53,26 L53,76 L47,76 Z', fill: 'hi', w: 1.1 },
  { d: 'M32,41 L68,41 L67,46.5 L33,46.5 Z', fill: 'eye', w: 1.1 },
  { d: `${circle(36.5, 56, 1.3)} ${circle(41, 56, 1.3)} ${circle(36.5, 61, 1.3)} ${circle(41, 61, 1.3)} ${circle(36.5, 66, 1.3)} ${circle(41, 66, 1.3)}`, fill: 'rim', mirror: true, stroke: 'none' },
]

const GOLD: Layer[] = [
  // Centurion: T-visor helm under a transverse fan crest
  { d: 'M50,4 C38,4 27,12 26.5,27 C33,22 41,19.5 50,19.5 Z', fill: 'a1', fillR: 'a2', mirror: true, w: 1.4 },
  { d: 'M50,4 C41,4 33,9 29.5,17 C35,13 42,11 50,11 Z', fill: 'a0', fillR: 'a1', mirror: true, stroke: 'none', o: 0.9 },
  { d: 'M50,19 L42,6 M50,19 L35,9 M50,19 L30,15', fill: 'none', mirror: true, w: 0.9, o: 0.45 },
  { d: 'M44,17 L56,17 L56,22 L44,22 Z', fill: 'dk', w: 1.1 },
  { d: 'M50,20 C38,20 30,29 30,42 L30,61 L39,72 L44.5,74 L44.5,62 L50,62 Z', ...shade, w: 2.2 },
  { d: 'M50,20 C44,20 39,23 36,28 L50,34 Z', fill: 'hi', stroke: 'none', o: 0.8 },
  { d: 'M30.5,39 C38,36.5 44,36 50,36 L50,38.5 C44,38.5 38,39 30.5,41.5 Z', fill: 'hi', fillR: 'lt', mirror: true, stroke: 'none', o: 0.6 },
  { d: 'M34,43 L66,43 L64,49 L53,49 L53,64 L47,64 L47,49 L36,49 Z', fill: 'rim', stroke: 'none' },
]

const KABUTO: Layer[] = [
  // Kabuto: ridged bowl, stepped neck guard, turn-back flaps, antler crest, war mask
  { d: 'M31,46 L12,55 L14,60.5 L31,53 Z', fill: 'lt', fillR: 'dk', mirror: true, w: 1.1 },
  { d: 'M31,53 L11,62 L13,67.5 L32,60 Z', fill: 'dk', fillR: 'dk', mirror: true, w: 1.1 },
  { d: 'M32,60 L13,69 L16.5,74 L33.5,66.5 Z', fill: 'lt', fillR: 'dk', mirror: true, w: 1.1 },
  { d: 'M31,39 L21,34 L23.5,50 L31.5,47 Z', fill: 'a1', fillR: 'a2', mirror: true, w: 1.1 },
  { d: 'M48.5,38.5 C45,30 41,20 35.5,12.5 C32.5,8.5 29,6 25,5 C30.5,4 36,6 39.5,10 C44.5,16.5 48.5,25.5 51.5,33 Z', fill: 'a0', fillR: 'a1', mirror: true, w: 1.1 },
  { d: 'M50,22 C40,22 32,29 31,42 L50,42 Z', ...shade, w: 2 },
  { d: 'M41.5,24 C38.5,30 36.5,36 36,42 M46,22.5 C44.5,29 43.5,36 43,42', fill: 'none', mirror: true, w: 0.8, o: 0.45 },
  { d: 'M27,41 L73,41 L70,47 L30,47 Z', fill: 'hi', w: 1.3 },
  { d: 'M34,47 L66,47 L63,64 C58,70 54,72 50,72 C46,72 42,70 37,64 Z', fill: 'rim', w: 1.2 },
  { d: 'M37,51.5 L46.5,53 L46,55.3 L37.6,54.2 Z', fill: 'eye', mirror: true, stroke: 'none' },
  { d: circle(50, 37, 4.2), fill: 'core', w: 1.1 },
]

/** The kabuto with Diamond flair: a crescent moon between the horns and a cut diamond at its heart. */
const KABUTO_DIAMOND: Layer[] = [
  ...KABUTO.slice(0, -1),
  { d: 'M38,27 C40,36 60,36 62,27 C58,32.5 42,32.5 38,27 Z', fill: 'a0', fillR: 'a1', w: 1.1 },
  { d: 'M50,31 L54.5,36.5 L50,43 L45.5,36.5 Z', fill: 'lt', w: 1.1 },
  { d: 'M50,31 L45.5,36.5 L50,36.5 Z', fill: 'core', stroke: 'none' },
  { d: 'M50,36.5 L54.5,36.5 L50,43 Z', fill: 'dk', stroke: 'none', o: 0.6 },
]

/** Polygon through `points`, rotated `deg` (clockwise) about the artboard centre. */
function poly(points: [number, number][], deg = 0): string {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const sn = Math.sin(a)
  return `M${points.map(([x, y]) => `${(50 + (x - 50) * c - (y - 50) * sn).toFixed(2)},${(50 + (x - 50) * sn + (y - 50) * c).toFixed(2)}`).join(' L')} Z`
}

const CRYSTAL: Layer[] = [
  // Crystal warden: a faceted helm cut like a gem, V visor, brow diamond, a fan of crystal shards
  { d: 'M38,30 L27,6 L35,10 L43,27 Z', fill: 'a0', fillR: 'a1', mirror: true, w: 1.1 },
  { d: 'M34,35 L12,16 L21,19 L37,31 Z', fill: 'a1', fillR: 'a2', mirror: true, w: 1.1 },
  { d: 'M31.5,42 L5,32 L14,31 L33,38 Z', fill: 'a0', fillR: 'a1', mirror: true, w: 1.1 },
  { d: 'M31,50 L7,50 L15,45.5 L31.5,46 Z', fill: 'a1', fillR: 'a2', mirror: true, w: 1.1 },
  { d: 'M35,10 L37,20 M21,19 L28,25 M14,31 L24,35', fill: 'none', stroke: 'hi', mirror: true, w: 0.8, o: 0.7 },
  { d: 'M50,19 L40,21 L32.5,28 L30,38 L30,56 L34,66 L42,74 L50,78 Z', ...shade, w: 2.2 },
  { d: 'M50,19 L40,21 L43.5,33 L50,35 Z', fill: 'hi', stroke: 'none', o: 0.75 },
  { d: 'M40,21 L43.5,33 L30,38 M43.5,33 L50,35 M30,56 L39.5,53 L42,74', fill: 'none', mirror: true, w: 0.9, o: 0.5 },
  { d: 'M32,43 L50,47.5 L68,43 L66,50.5 L50,55 L34,50.5 Z', fill: 'rim', w: 1.1 },
  { d: 'M36,45.8 L47.2,48.6 L46.6,51.2 L36.6,48.6 Z', fill: 'eye', mirror: true, stroke: 'none' },
  { d: 'M50,55 L50,77.5', fill: 'none', w: 1, o: 0.55 },
  { d: 'M50,25 L57,33 L50,43 L43,33 Z', fill: 'lt', w: 1.2 },
  { d: 'M50,25 L43,33 L50,33 Z', fill: 'core', stroke: 'none' },
  { d: 'M50,33 L57,33 L50,43 Z', fill: 'dk', stroke: 'none', o: 0.6 },
]

// Greatsword pointing up; drawn rotated so two of them cross behind the helm
// Greatsword drawn upright, then turned so the two cross behind the helm point-down
const SWORD_BLADE_L: [number, number][] = [[50, 6], [46.5, 13], [46.5, 72], [50, 72]]
const SWORD_BLADE_R: [number, number][] = [[50, 6], [53.5, 13], [53.5, 72], [50, 72]]
const SWORD_GUARD: [number, number][] = [[37, 71.5], [63, 71.5], [61, 76.5], [39, 76.5]]
const SWORD_GRIP: [number, number][] = [[48.2, 76.5], [51.8, 76.5], [51.8, 86], [48.2, 86]]
const SWORD_POMMEL: [number, number][] = [[50, 85], [53.2, 89], [50, 93], [46.8, 89]]
const TILT = 115

const CHAMPION: Layer[] = [
  // War king: greatswords crossed point-down, a heavy close helm with a sharp jaw, a forged five-spike crown
  { d: poly(SWORD_BLADE_L, TILT), fill: 'core', mirror: true, w: 1.1 },
  { d: poly(SWORD_BLADE_R, TILT), fill: 'lt', mirror: true, w: 1.1 },
  { d: poly(SWORD_GUARD, TILT), fill: 'a1', mirror: true, w: 1.1 },
  { d: poly(SWORD_GRIP, TILT), fill: 'a2', mirror: true, w: 1 },
  { d: poly(SWORD_POMMEL, TILT), fill: 'a0', mirror: true, w: 1 },
  { d: 'M41,75 L50,81 L59,75 L56,84 L50,91 L44,84 Z', fill: 'dk', w: 1.3 },
  { d: 'M50,21 C40,21 32,27 30,38 L29,55 L33,66 L42,75.5 L50,81 Z', ...shade, w: 2.3 },
  { d: 'M31,54 L34.5,64 L43,72.5', fill: 'none', mirror: true, w: 1, o: 0.45 },
  { d: 'M31,44 L69,44 L67.5,51 L57,57 L50,70 L43,57 L32.5,51 Z', fill: 'dk', w: 1.5 },
  { d: 'M50,44 L50,70', fill: 'none', w: 1.1, o: 0.8 },
  { d: 'M34,46.5 L66,46.5 L65,49.5 L35,49.5 Z', fill: 'eye', stroke: 'none' },
  { d: 'M40,53 L46,55.5 L47.5,60 M43,58.5 L46.5,60.5 L48,64.5', fill: 'none', mirror: true, w: 1.1, o: 0.8 },
  { d: 'M50,35.5 L30.5,35.5 L28.5,15 L37,23.5 L42,8.5 L46,19 L50,3.5 Z', fill: 'a0', fillR: 'a1', mirror: true, w: 1.3 },
  { d: 'M30.5,31 L50,31 L50,36.5 L30.5,36.5 Z', fill: 'a1', fillR: 'a2', mirror: true, w: 1.1 },
  { d: `${circle(28.5, 14.5, 2)} ${circle(42, 8, 2)}`, fill: 'a0', mirror: true, w: 1 },
  { d: circle(50, 3.5, 2.3), fill: 'a0', w: 1 },
  { d: 'M50,27.5 L53.5,33.7 L50,40 L46.5,33.7 Z', fill: 'core', w: 1 },
  { d: circle(39.5, 33.8, 1.5), fill: 'eye', mirror: true, w: 0.8 },
]

const TITAN: Layer[] = [
  // Dread lord: obsidian helm edged in crimson, swept horns, a crown of blades, slit eyes, breathing grille
  { d: 'M37,29 C27,28 17,22 11,12 C8,7 6,3 6.5,-2.5 C11,5 16,11 24,16 C29,19 34,21 39,22 Z', fill: 'a0', fillR: 'a1', mirror: true, stroke: 'a2', w: 1.3 },
  { d: 'M14,9 L18.5,10.5 M19,15 L23,15.5 M25,19.5 L28.5,19', fill: 'none', stroke: 'a2', mirror: true, w: 0.9, o: 0.8 },
  { d: 'M50,2 L54,20 L50,23 L46,20 Z', fill: 'lt', fillR: 'dk', stroke: 'a2', w: 1.1 },
  { d: 'M42.5,7 L46,21.5 L40,23.5 Z', fill: 'lt', fillR: 'dk', mirror: true, stroke: 'a2', w: 1.1 },
  { d: 'M36,13.5 L40.5,24.5 L34.5,27 Z', fill: 'lt', fillR: 'dk', mirror: true, stroke: 'a2', w: 1.1 },
  { d: 'M32.5,55 L21,59 L33,63 Z', fill: 'dk', mirror: true, stroke: 'a2', w: 1.1 },
  { d: 'M50,20 L40,22 L33,29 L31,40 L28,48 L32,54 L33,64 L40,74 L50,83 Z', ...shade, stroke: 'a2', w: 2 },
  { d: 'M50,20 L40,22 L35,27 L50,31 Z', fill: 'hi', stroke: 'none', o: 0.25 },
  { d: 'M31,40.5 L50,46 L69,40.5 L68,47 L50,53.5 L32,47 Z', fill: 'rim', stroke: 'none' },
  { d: 'M34.5,44.5 L47,48.8 L46.4,51.4 L35.3,47.6 Z', fill: 'eye', mirror: true, stroke: 'none' },
  { d: 'M33.5,57 L41.5,69 M31,40 L47,45', fill: 'none', stroke: 'core', mirror: true, w: 0.9, o: 0.75 },
  { d: 'M44,59 L56,59 L55,72 L50,76 L45,72 Z', fill: 'rim', stroke: 'none' },
  { d: 'M47,61.5 L47,71 M50,61 L50,73.5 M53,61.5 L53,71', fill: 'none', stroke: 'core', w: 1.2, o: 0.9 },
  { d: 'M50,29.5 L53,34.5 L50,39.5 L47,34.5 Z', fill: 'core', stroke: 'rim', w: 0.9 },
]

/** Four-point sparkle at (x, y). */
const sparkle = (x: number, y: number, r: number) =>
  `M${x},${y - r} L${x + r * 0.22},${y - r * 0.22} L${x + r},${y} L${x + r * 0.22},${y + r * 0.22} L${x},${y + r} L${x - r * 0.22},${y + r * 0.22} L${x - r},${y} L${x - r * 0.22},${y - r * 0.22} Z`

const OLYMPIAN: Layer[] = [
  // Celestial helm: a faceted pearl mask under a floating gold halo (Titan wears horns), a glowing
  // heart gem on the brow, stepped crystal blades, chevron gorget
  { d: rays(8, 32, 54, 1.1, 22.5), fill: 'a0', stroke: 'none', o: 0.7 },
  { d: 'M50,97 L12,66 L19,66 L50,91 Z', fill: 'a1', fillR: 'a2', mirror: true, w: 0.9 },
  { d: 'M50,89.5 L22,67 L28,67 L50,84.5 Z', fill: 'hi', fillR: 'dk', mirror: true, w: 0.9 },
  // Stepped crystal blades at the temples
  { d: 'M36,29 L7,52 L19.5,52 L19.5,64 L31,73 L33.5,49 Z', fill: 'lt', fillR: 'dk', mirror: true, w: 1.3 },
  { d: 'M34,32.5 L13,49.5 L17,49.5 L35.5,34.5 Z', fill: 'a1', fillR: 'a2', mirror: true, stroke: 'none' },
  { d: 'M7,52 L33.5,57 M19.5,64 L32,62 M33,40 L26,50', fill: 'none', stroke: 'hi', mirror: true, w: 0.7, o: 0.6 },
  // Halo floating over the helm, light falling from it
  { d: 'M34,13 L66,13 L60,24 L40,24 Z', fill: 'lt', stroke: 'none', o: 0.22 },
  { d: ellipse(50, 10, 19, 5.4), fill: 'none', stroke: 'rim', w: 6.4 },
  { d: ellipse(50, 10, 19, 5.4), fill: 'none', stroke: 'a1', w: 4.2 },
  { d: ellipse(50, 10, 19, 5.4), fill: 'none', stroke: 'a0', w: 1.3 },
  // The helm
  { d: 'M50,22 L41,24 L35,31 L33,42 L33,58 L37,68 L44,76 L50,80 Z', ...shade, w: 2.2 },
  { d: 'M50,22 L41,24 L37.5,29 L50,33 Z', fill: 'hi', stroke: 'none', o: 0.8 },
  { d: 'M41,24 L43.5,35 L33,42 M33,58 L41,56.5 L44,76', fill: 'none', mirror: true, w: 0.9, o: 0.45 },
  { d: 'M34.5,57 L38,66.5 L44.5,73.5', fill: 'none', stroke: 'a1', mirror: true, w: 1.1 },
  // Visor and faceplate
  { d: 'M34.5,47.5 L50,51.5 L65.5,47.5 L64.5,54.5 L50,58.5 L35.5,54.5 Z', fill: 'rim', w: 1 },
  { d: 'M37.5,50 L47,52.5 L46.6,55 L38,52.8 Z', fill: 'eye', mirror: true, stroke: 'none' },
  { d: 'M40.5,61.5 L59.5,61.5 L57.5,67.5 L53.5,67.5 L50,75.5 L46.5,67.5 L42.5,67.5 Z', fill: 'dk', w: 1.2 },
  { d: 'M50,61.5 L50,75.5', fill: 'none', w: 1, o: 0.7 },
  // Heart gem on the brow, glowing from within
  { d: 'M50,20 L57,26 L57,40 L50,46 L43,40 L43,26 Z', fill: 'a2', w: 1.3 },
  { d: 'M50,23 L54.5,27 L54.5,39 L50,43 L45.5,39 L45.5,27 Z', fill: 'a1', w: 0.9 },
  { d: 'M50,23 L45.5,27 L45.5,39 L50,43 Z', fill: 'a0', stroke: 'none', o: 0.85 },
  { d: 'M50,28 L52.3,30.2 L52.3,35.8 L50,38 L47.7,35.8 L47.7,30.2 Z', fill: 'eye', stroke: 'a2', w: 0.8 },
  { d: sparkle(50, 33, 5.5), fill: 'core', stroke: 'none' },
  // Glints
  { d: `${sparkle(26, 31, 3)} ${sparkle(71, 60, 2.4)} ${sparkle(79, 20, 2.4)}`, fill: 'core', stroke: 'none' },
]

export interface BadgeArt {
  pal: Palette
  layers: Layer[]
}

export const BADGES: Record<TierKey, BadgeArt> = {
  wood: {
    pal: { hi: '#f2c592', lt: '#c98a4e', dk: '#8a5226', rim: '#3d2210', core: '#f0c08a', eye: '#2a160a', a0: '#f2c592', a1: '#c98a4e', a2: '#8a5226' },
    layers: WOOD,
  },
  bronze: {
    pal: { hi: '#ffd9bd', lt: '#dc976b', dk: '#9a5634', rim: '#4a2512', core: '#ffd0ae', eye: '#2e1509', a0: '#ffd9bd', a1: '#dc976b', a2: '#9a5634' },
    layers: BRONZE,
  },
  silver: {
    pal: { hi: '#ffffff', lt: '#d9e0ea', dk: '#8d99aa', rim: '#343d4a', core: '#f4f7fb', eye: '#1d232c', a0: '#ffffff', a1: '#d9e0ea', a2: '#8d99aa' },
    layers: SILVER,
  },
  gold: {
    pal: { hi: '#fff4bd', lt: '#f5c84c', dk: '#b37c0c', rim: '#553600', core: '#fff3b0', eye: '#2e1d00', a0: '#ffc46b', a1: '#ec8a1c', a2: '#a4520a' },
    layers: GOLD,
  },
  platinum: {
    pal: { hi: '#e2fff8', lt: '#6fe6c8', dk: '#1f9a80', rim: '#0a463b', core: '#ffffff', eye: '#dcfff5', a0: '#d6fff3', a1: '#8eeed6', a2: '#2fae92', glow: '#62e3c4' },
    layers: CRYSTAL,
  },
  diamond: {
    pal: { hi: '#e9eaff', lt: '#9199ff', dk: '#474cc4', rim: '#1d206b', core: '#f4f5ff', eye: '#dfe3ff', a0: '#eef0ff', a1: '#b3b8ff', a2: '#5d63d8', glow: '#8f96ff' },
    layers: KABUTO_DIAMOND,
  },
  champion: {
    pal: { hi: '#f6dcff', lt: '#c77df0', dk: '#7a32b3', rim: '#2e0b4f', core: '#fdf3ff', eye: '#ffe9ff', a0: '#ffe08a', a1: '#e7ac2a', a2: '#8f5d00', glow: '#d68bff' },
    layers: CHAMPION,
  },
  titan: {
    pal: { hi: '#ff9aa0', lt: '#4a1a1e', dk: '#23090c', rim: '#0b0203', core: '#ff3d47', eye: '#ff5a3c', a0: '#3a1215', a1: '#1c0709', a2: '#d2202c', glow: '#f2555d' },
    layers: TITAN,
  },
  olympian: {
    pal: { hi: '#ffffff', lt: '#e3f4ff', dk: '#9ccbea', rim: '#0b2e4a', core: '#ffffff', eye: '#8cecff', a0: '#fff3c4', a1: '#f2c94c', a2: '#b07f0c', glow: '#6fd0ff' },
    layers: OLYMPIAN,
  },
}
