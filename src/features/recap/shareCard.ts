import { formatDurationMin } from '@/lib/format'
import { formatVolume } from '@/lib/workoutMath'
import { badgeImage } from '@/features/ranks/components/badgeImage'
import { headline } from './headline'
import { periodLabel } from './period'
import type { Recap } from './recap'

/**
 * The recap as a picture for the group chat: 1080×1350 (4:5, what chat apps show whole).
 * Drawn on a canvas so it needs no library. Always dark, so it reads the same in any chat,
 * with the header in the theme's accent gradient. Training, steps, rank and new bests only:
 * food and body weight stay private, as on the leaderboard.
 */

const W = 1080
const H = 1350
const PAD = 64
const BG = '#0a0a0b'
const CARD = '#18181b'
const FG = '#fafafa'
const MUTED = '#9b9ba3'
const HEADING = '"Outfit Variable", "Inter Variable", system-ui, sans-serif'
const BODY = '"Inter Variable", system-ui, sans-serif'

export interface CardOwner {
  name: string
  /** Profile photo (a small JPEG data URL). */
  avatar?: string
}

type Ctx = CanvasRenderingContext2D

const themeColor = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v ? `hsl(${v})` : fallback
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function font(ctx: Ctx, weight: number, size: number, family = BODY) {
  ctx.font = `${weight} ${size}px ${family}`
}

/** `text` cut to `width` with an ellipsis. */
function fit(ctx: Ctx, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

/** Word-wrapped lines, at most `max`, the last one ellipsised if it doesn't all fit. */
function wrap(ctx: Ctx, text: string, width: number, max: number): string[] {
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
function logo(ctx: Ctx, x: number, y: number, size: number, top: string, rest: string) {
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

function card(ctx: Ctx, x: number, y: number, w: number, h: number, r = 40) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = CARD
  ctx.fill()
}

function stats(recap: Recap): { value: string; label: string }[] {
  const { training, steps } = recap
  const out: { value: string; label: string }[] = []
  if (training.workouts > 0) out.push({ value: String(training.workouts), label: training.workouts === 1 ? 'Workout' : 'Workouts' })
  if (training.activeMin > 0) out.push({ value: formatDurationMin(Math.round(training.activeMin)), label: 'Training time' })
  if (training.volume > 0) out.push({ value: formatVolume(training.volume), label: `Lifted in ${training.sets} sets` })
  if (steps.total > 0) out.push({ value: steps.total.toLocaleString(), label: 'Steps' })
  if (training.cardioKm > 0) out.push({ value: `${training.cardioKm.toFixed(1)} km`, label: 'Cardio' })
  return out.slice(0, 4)
}

export async function renderRecapCard(recap: Recap, owner: CardOwner, current: boolean): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`700 80px ${HEADING}`),
    document.fonts.load(`600 40px ${BODY}`),
    document.fonts.load(`500 30px ${BODY}`),
  ]).catch(() => {})
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser can’t draw images')
  ctx.textBaseline = 'alphabetic'

  const from = themeColor('--brand-from', '#ff7a1a')
  const to = themeColor('--brand-to', '#e8361f')
  const onBrand = themeColor('--primary-foreground', '#ffffff')
  const accent = themeColor('--primary', '#ff5f1a')
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  // Header: who, which period, the headline
  const bandH = 400
  const gradient = ctx.createLinearGradient(0, 0, W, bandH)
  gradient.addColorStop(0, from)
  gradient.addColorStop(1, to)
  ctx.beginPath()
  ctx.roundRect(24, 24, W - 48, bandH, 56)
  ctx.fillStyle = gradient
  ctx.fill()
  logo(ctx, PAD, 64, 48, onBrand, onBrand)
  ctx.fillStyle = onBrand
  font(ctx, 700, 26)
  ctx.globalAlpha = 0.85
  ctx.fillText('SOLO LEVELING', PAD + 64, 98)
  ctx.globalAlpha = 1
  const photo = owner.avatar ? await loadImage(owner.avatar) : null
  if (photo) {
    const r = 56
    const cx = W - PAD - r
    const cy = 64 + r - 8
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(photo, cx - r, cy - r, r * 2, r * 2)
    ctx.restore()
  }
  const first = owner.name.split(/\s+/)[0]
  font(ctx, 700, 84, HEADING)
  ctx.fillText(fit(ctx, `${first ? `${first}’s` : 'My'} ${recap.period}`, W - PAD * 2), PAD, 222)
  font(ctx, 500, 36)
  ctx.globalAlpha = 0.85
  ctx.fillText(`${periodLabel(recap.period, recap.dates[0])}${current ? ' · so far' : ''}`, PAD, 276)
  ctx.globalAlpha = 1
  font(ctx, 600, 38)
  wrap(ctx, headline(recap, { shared: true }), W - PAD * 2, 2).forEach((line, i) => ctx.fillText(line, PAD, 344 + i * 50))

  // Stat tiles, two a row
  let y = 24 + bandH + 36
  const tiles = stats(recap)
  const colW = (W - PAD * 2 - 24) / 2
  const tileH = 160
  tiles.forEach((t, i) => {
    const x = PAD + (i % 2) * (colW + 24)
    const ty = y + Math.floor(i / 2) * (tileH + 24)
    card(ctx, x, ty, colW, tileH)
    ctx.fillStyle = FG
    font(ctx, 700, 64, HEADING)
    ctx.fillText(fit(ctx, t.value, colW - 72), x + 36, ty + 88)
    ctx.fillStyle = MUTED
    font(ctx, 500, 28)
    ctx.fillText(fit(ctx, t.label, colW - 72), x + 36, ty + 130)
  })
  if (tiles.length) y += Math.ceil(tiles.length / 2) * (tileH + 24) + 4

  // Overall rank
  if (recap.rank) {
    const { from: was, to: now } = recap.rank
    const h = 150
    card(ctx, PAD, y, W - PAD * 2, h)
    const badge = await badgeImage(now.tier.key, 132).catch(() => null)
    if (badge) {
      ctx.save()
      ctx.shadowColor = now.tier.color
      ctx.shadowBlur = 28
      ctx.drawImage(badge, PAD + 16, y + 9, 132, 132)
      ctx.restore()
    }
    const tx = PAD + 168
    ctx.fillStyle = MUTED
    font(ctx, 600, 24)
    ctx.fillText('OVERALL RANK', tx, y + 46)
    ctx.fillStyle = now.tier.color
    font(ctx, 700, 50, HEADING)
    ctx.fillText(now.label, tx, y + 98)
    const up = !was || now.step > was.step
    const gained = was ? now.rating - was.rating : 0
    const note = up ? (was ? `Up from ${was.label}` : 'First overall rank') : gained > 0 ? `+${gained} rating` : 'Held'
    ctx.fillStyle = MUTED
    font(ctx, 500, 28)
    ctx.fillText(note, tx, y + 132)
    y += h + 28
  }

  // New bests, as many as fit above the footer
  const footerY = H - 64
  if (recap.bests.length && y + 120 < footerY - 40) {
    ctx.fillStyle = FG
    font(ctx, 700, 40, HEADING)
    ctx.fillText('New bests', PAD, y + 40)
    ctx.fillStyle = accent
    ctx.fillText(` ${recap.bests.length}`, PAD + ctx.measureText('New bests').width, y + 40)
    y += 60
    for (const b of recap.bests) {
      if (y + 56 > footerY - 40) break
      const unit = b.kind === '1rm' ? 'kg' : 'km'
      const value = `${b.from} → ${b.to} ${unit}`
      font(ctx, 600, 30)
      const vw = ctx.measureText(value).width
      ctx.fillStyle = FG
      ctx.fillText(fit(ctx, b.name, W - PAD * 2 - vw - 32), PAD, y + 40)
      ctx.fillStyle = accent
      ctx.fillText(value, W - PAD - vw, y + 40)
      y += 56
    }
  }

  // Footer
  logo(ctx, PAD, footerY - 30, 36, accent, MUTED)
  ctx.fillStyle = MUTED
  font(ctx, 600, 26)
  ctx.fillText('Solo Leveling', PAD + 48, footerY)

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Couldn’t make the image'))), 'image/png'))
}
