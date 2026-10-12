import type { RankInfo } from '@/features/ranks/tiers'
import { badgeImage } from '@/features/ranks/components/badgeImage'

/**
 * Drawing for the share cards (the recap's, a workout's): 1080×1350 (4:5, what chat apps show
 * whole), on a canvas so it needs no library. Always dark, so a card reads the same in any
 * chat, with the header in the theme's accent gradient. Each card lays out its own content
 * from these pieces; what may go on one is the card's call (never food, weight or notes).
 */

export const CARD_W = 1080
export const CARD_H = 1350
export const PAD = 64
export const FG = '#fafafa'
export const MUTED = '#9b9ba3'
const BG = '#0a0a0b'
const SURFACE = '#18181b'
export const HEADING = '"Outfit Variable", "Inter Variable", system-ui, sans-serif'
export const BODY = '"Inter Variable", system-ui, sans-serif'
/** Where the footer's baseline sits; content stops above it. */
export const FOOTER_Y = CARD_H - 64

export interface CardOwner {
  name: string
  /** Profile photo (a small JPEG data URL). */
  avatar?: string
}

export type Ctx = CanvasRenderingContext2D

export interface CardColors {
  from: string
  to: string
  /** Text on the accent gradient. */
  onBrand: string
  accent: string
}

export interface Tile {
  value: string
  label: string
}

const themeColor = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v ? `hsl(${v})` : fallback
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export function font(ctx: Ctx, weight: number, size: number, family = BODY) {
  ctx.font = `${weight} ${size}px ${family}`
}

/** `text` cut to `width` with an ellipsis. */
export function fit(ctx: Ctx, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

/** Word-wrapped lines, at most `max`, the last one ellipsised if it doesn't all fit. */
export function wrap(ctx: Ctx, text: string, width: number, max: number): string[] {
  const lines: string[] = []
  let line = ''
  const words = text.split(' ')
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i]
    if (ctx.measureText(next).width <= width) {
      line = next
      continue
    }
    if (lines.length === max - 1) return [...lines, fit(ctx, [line, ...words.slice(i)].join(' ').trim(), width)]
    lines.push(line)
    line = words[i]
  }
  return line ? [...lines, line] : lines
}

/** The Ascent mark (components/Logo.tsx geometry), `size` px square at (x, y). */
export function logo(ctx: Ctx, x: number, y: number, size: number, top: string, rest: string) {
  const s = size / 72
  const chevron = (cy: number, color: string) => {
    const pts = [[50, cy], [80, cy + 30], [67, cy + 30], [50, cy + 13], [33, cy + 30], [20, cy + 30]]
    ctx.beginPath()
    pts.forEach(([px, py], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, x + (px - 14) * s, y + (py - 12) * s))
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }
  chevron(12, top)
  chevron(33, rest)
  chevron(54, rest)
}

/** A rounded card surface. */
export function surface(ctx: Ctx, x: number, y: number, w: number, h: number, r = 40) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = SURFACE
  ctx.fill()
}

/** A blank card with the fonts loaded and the theme's accent colours read. */
export async function startCard(): Promise<{ canvas: HTMLCanvasElement; ctx: Ctx; colors: CardColors }> {
  await Promise.all([
    document.fonts.load(`700 80px ${HEADING}`),
    document.fonts.load(`600 40px ${BODY}`),
    document.fonts.load(`500 30px ${BODY}`),
  ]).catch(() => {})
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser can’t draw images')
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  const colors: CardColors = {
    from: themeColor('--brand-from', '#ff7a1a'),
    to: themeColor('--brand-to', '#e8361f'),
    onBrand: themeColor('--primary-foreground', '#ffffff'),
    accent: themeColor('--primary', '#ff5f1a'),
  }
  return { canvas, ctx, colors }
}

interface Header {
  title: string
  subtitle: string
  /** Up to two lines, or one when there's a `note`. */
  headline: string
  /** A quieter last line (a workout's muscles). */
  note?: string
}

const BAND_H = 400

/** The accent header: the mark, the owner's photo, a title, a subtitle, the headline. Returns the y below it. */
export async function drawHeader(ctx: Ctx, colors: CardColors, owner: CardOwner, h: Header): Promise<number> {
  const gradient = ctx.createLinearGradient(0, 0, CARD_W, BAND_H)
  gradient.addColorStop(0, colors.from)
  gradient.addColorStop(1, colors.to)
  ctx.beginPath()
  ctx.roundRect(24, 24, CARD_W - 48, BAND_H, 56)
  ctx.fillStyle = gradient
  ctx.fill()
  logo(ctx, PAD, 64, 48, colors.onBrand, colors.onBrand)
  ctx.fillStyle = colors.onBrand
  font(ctx, 700, 26)
  ctx.globalAlpha = 0.85
  ctx.fillText('SOLO LEVELING', PAD + 64, 98)
  ctx.globalAlpha = 1
  const photo = owner.avatar ? await loadImage(owner.avatar) : null
  if (photo) {
    const r = 56
    const cx = CARD_W - PAD - r
    const cy = 64 + r - 8
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(photo, cx - r, cy - r, r * 2, r * 2)
    ctx.restore()
  }
  const width = CARD_W - PAD * 2
  font(ctx, 700, 84, HEADING)
  ctx.fillText(fit(ctx, h.title, width), PAD, 222)
  font(ctx, 500, 36)
  ctx.globalAlpha = 0.85
  ctx.fillText(fit(ctx, h.subtitle, width), PAD, 276)
  ctx.globalAlpha = 1
  font(ctx, 600, 38)
  const lines = wrap(ctx, h.headline, width, h.note ? 1 : 2)
  lines.forEach((line, i) => ctx.fillText(line, PAD, 344 + i * 50))
  if (h.note) {
    font(ctx, 500, 32)
    ctx.globalAlpha = 0.85
    ctx.fillText(fit(ctx, h.note, width), PAD, 392)
    ctx.globalAlpha = 1
  }
  return 24 + BAND_H + 36
}

/** Stat tiles, `perRow` to a row. Returns the y below them. */
export function drawTiles(ctx: Ctx, y: number, tiles: Tile[], perRow = 2): number {
  if (!tiles.length) return y
  const gap = 24
  const colW = (CARD_W - PAD * 2 - gap * (perRow - 1)) / perRow
  const tileH = 160
  const valueSize = perRow > 2 ? 56 : 64
  tiles.forEach((t, i) => {
    const x = PAD + (i % perRow) * (colW + gap)
    const ty = y + Math.floor(i / perRow) * (tileH + gap)
    surface(ctx, x, ty, colW, tileH)
    ctx.fillStyle = FG
    font(ctx, 700, valueSize, HEADING)
    ctx.fillText(fit(ctx, t.value, colW - 72), x + 36, ty + 88)
    ctx.fillStyle = MUTED
    font(ctx, 500, 28)
    ctx.fillText(fit(ctx, t.label, colW - 72), x + 36, ty + 130)
  })
  return y + Math.ceil(tiles.length / perRow) * (tileH + gap) + 4
}

/** A rank on a card: its emblem, a small caps line, the rank in its tier colour, a note. Returns the y below it. */
export async function drawRankRow(ctx: Ctx, y: number, r: { eyebrow: string; rank: RankInfo; note: string }): Promise<number> {
  const h = 150
  surface(ctx, PAD, y, CARD_W - PAD * 2, h)
  const badge = await badgeImage(r.rank.tier.key, 132).catch(() => null)
  if (badge) {
    ctx.save()
    ctx.shadowColor = r.rank.tier.color
    ctx.shadowBlur = 28
    ctx.drawImage(badge, PAD + 16, y + 9, 132, 132)
    ctx.restore()
  }
  const tx = PAD + 168
  const width = CARD_W - PAD - 32 - tx
  ctx.fillStyle = MUTED
  font(ctx, 600, 24)
  ctx.fillText(fit(ctx, r.eyebrow, width), tx, y + 46)
  ctx.fillStyle = r.rank.tier.color
  font(ctx, 700, 50, HEADING)
  ctx.fillText(r.rank.label, tx, y + 98)
  ctx.fillStyle = MUTED
  font(ctx, 500, 28)
  ctx.fillText(fit(ctx, r.note, width), tx, y + 132)
  return y + h + 28
}

/** A section heading with a count after it in the accent ("New bests 3"). */
export function drawHeading(ctx: Ctx, y: number, text: string, count: number, accent: string) {
  ctx.fillStyle = FG
  font(ctx, 700, 40, HEADING)
  ctx.fillText(text, PAD, y + 40)
  ctx.fillStyle = accent
  ctx.fillText(` ${count}`, PAD + ctx.measureText(text).width, y + 40)
}

/** The app's mark and name at the bottom, then the PNG. */
export function finishCard(canvas: HTMLCanvasElement, ctx: Ctx, colors: CardColors): Promise<Blob> {
  logo(ctx, PAD, FOOTER_Y - 30, 36, colors.accent, MUTED)
  ctx.fillStyle = MUTED
  font(ctx, 600, 26)
  ctx.fillText('Solo Leveling', PAD + 48, FOOTER_Y)
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Couldn’t make the image'))), 'image/png'))
}
