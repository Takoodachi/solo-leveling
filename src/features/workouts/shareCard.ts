import { format, parseISO } from 'date-fns'
import type { WorkoutSetWithExercise, WorkoutWithSets } from '@/types'
import { formatDurationMin } from '@/lib/format'
import { formatKm } from '@/lib/cardio'
import { REGION_LABEL, type MuscleRegion } from '@/features/ranks/standards'
import type { RankUp } from '@/features/ranks/computeRanks'
import { BADGES } from '@/features/ranks/components/badgeArt'
import { badgeImage } from '@/features/ranks/components/badgeImage'
import { BACK, CENTER_BACK, CENTER_FRONT, FRONT, type Shape } from '@/features/ranks/components/bodygraphShapes'
import { initials } from '@/features/settings/avatar'
import { BODY, HEADING, fit, loadImage, logo, wrap, type CardOwner, type Ctx } from '@/features/share/card'
import { describeBest, type NewBest } from './hooks/useWorkoutHistory'
import { describeSet } from './describeSet'
import { LISTED, MIN_ALPHA, musclesWorked } from './musclesWorked'
import { summaryStats } from './summaryStats'

/**
 * A workout's summary screen as a picture: the owner's name and photo, then the screen's own
 * cards in its order (the figures and the body map, rank ups, new bests, every exercise set by
 * set), drawn on a canvas in the theme's colours. It's laid out in CSS pixels on a phone-wide
 * page, with the same sizes as the screen, and drawn 1080 px wide. The workout's notes stay
 * off it; everything else on it is already on the screen.
 */

export interface WorkoutShare {
  workout: WorkoutWithSets
  bests: NewBest[]
  rankUps: RankUp[]
  /** Exercises logged in pounds: their sets read in lb, as in the app. */
  lb: ReadonlySet<string>
}

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`
const sentence = (parts: string[]) => `${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ' and ' : ''}${parts[parts.length - 1]}.`

/** The line sent with the image: "6 exercises, 15 sets, 1 new best and 1 rank-up." */
export function workoutHeadline({ workout, bests, rankUps }: WorkoutShare): string {
  const lifts = workout.sets.filter(s => s.exercise.type !== 'cardio')
  const km = workout.sets.reduce((n, s) => n + (s.exercise.type === 'cardio' ? (s.distanceKm ?? 0) : 0), 0)
  const parts: string[] = []
  if (lifts.length) parts.push(plural(new Set(lifts.map(s => s.exerciseId)).size, 'exercise'), plural(lifts.length, 'set'))
  if (km > 0) parts.push(`${formatKm(km)} of cardio`)
  if (bests.length) parts.push(plural(bests.length, 'new best'))
  if (rankUps.length) parts.push(plural(rankUps.length, 'rank-up'))
  return parts.length ? sentence(parts) : `${formatDurationMin(workout.durationMin)} of training.`
}

// ---- Page and type, in CSS pixels (the screen's Tailwind sizes) ----

const W = 390
const OUT_W = 1080
/** iOS won't draw a canvas much past 16.7 million pixels: a very long workout is drawn smaller. */
const MAX_PX = 16_000_000
const GUTTER = 16
const PAD = 20
const GAP = 20
const TOP = 24
const INNER = W - GUTTER * 2 - PAD * 2

interface Type { size: number; line: number; weight: number; heading?: boolean }
const XS: Type = { size: 12, line: 16, weight: 400 }
const SM: Type = { size: 14, line: 20, weight: 400 }
const BASE: Type = { size: 16, line: 24, weight: 500 }
const H2: Type = { size: 16, line: 24, weight: 600, heading: true }
const EYEBROW: Type = { size: 11, line: 16, weight: 600 }
const TITLE: Type = { size: 24, line: 32, weight: 700, heading: true }

function setType(ctx: Ctx, t: Type, weight = t.weight) {
  ctx.font = `${weight} ${t.size}px ${t.heading ? HEADING : BODY}`
}

/** One line of text in a line box of `t.line` starting at `top`, set the way the browser centres it. */
function say(ctx: Ctx, text: string, x: number, top: number, t: Type, color: string, align: CanvasTextAlign = 'left', weight = t.weight) {
  setType(ctx, t, weight)
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.fillText(text, x, top + t.line / 2 + 0.36 * t.size)
  ctx.textAlign = 'left'
}

/** Text width in `t`. */
function measure(ctx: Ctx, text: string, t: Type, weight = t.weight): number {
  setType(ctx, t, weight)
  return ctx.measureText(text).width
}

// ---- Colours: the theme's own tokens, resolved to plain rgb for the canvas ----

type RGB = readonly [number, number, number]
const rgba = ([r, g, b]: RGB, a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map(i => Math.round(a[i] * t + b[i] * (1 - t))) as [number, number, number]
const hex = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]

interface Colors {
  dark: boolean
  bg: RGB
  card: RGB
  fg: RGB
  muted: RGB
  primary: RGB
  onPrimary: RGB
  from: RGB
  to: RGB
  /** How much of a tier's colour its text keeps (`--ink`, see lib/colors). */
  ink: number
  badgeGlow: number
  bodyLine: number
  muscleLine: number
  detailLine: number
}

function readColors(): Colors {
  const root = document.documentElement
  const vars = getComputedStyle(root)
  const num = (name: string, fallback: number) => {
    const v = parseFloat(vars.getPropertyValue(name))
    return Number.isFinite(v) ? v : fallback
  }
  // The browser resolves the variables (and any alpha) into rgb for us
  const probe = document.createElement('span')
  probe.style.display = 'none'
  document.body.append(probe)
  const rgb = (token: string, fallback: RGB): RGB => {
    probe.style.color = ''
    probe.style.color = `hsl(var(${token}))`
    const n = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number)
    return n && n.length >= 3 ? [n[0], n[1], n[2]] : fallback
  }
  const colors: Colors = {
    dark: root.classList.contains('dark'),
    bg: rgb('--background', [10, 10, 11]),
    card: rgb('--card', [24, 24, 27]),
    fg: rgb('--foreground', [250, 250, 250]),
    muted: rgb('--muted-foreground', [155, 155, 163]),
    primary: rgb('--primary', [255, 95, 26]),
    onPrimary: rgb('--primary-foreground', [255, 255, 255]),
    from: rgb('--brand-from', [255, 122, 26]),
    to: rgb('--brand-to', [232, 54, 31]),
    ink: num('--ink', 100) / 100,
    badgeGlow: num('--badge-glow', 60) / 100,
    bodyLine: num('--body-line', 0.8),
    muscleLine: num('--muscle-line', 0.95),
    detailLine: num('--detail-line', 0.4),
  }
  probe.remove()
  return colors
}

// ---- Blocks: each knows its height before anything is drawn, so the page can be sized first ----

interface Block {
  height: number
  draw: (ctx: Ctx, top: number) => void
}

/** A card the width of the page, its content inset by the card's padding. */
function cardBlock(inner: Block, fill: string, ring?: string): Block {
  return {
    height: inner.height + PAD * 2,
    draw(ctx, top) {
      ctx.beginPath()
      ctx.roundRect(GUTTER, top, W - GUTTER * 2, inner.height + PAD * 2, 24)
      ctx.fillStyle = fill
      ctx.fill()
      if (ring) {
        ctx.strokeStyle = ring
        ctx.lineWidth = 1
        ctx.stroke()
      }
      inner.draw(ctx, top + PAD)
    },
  }
}

const X0 = GUTTER + PAD

const ICONS = {
  trendingUp: ['M16 7h6v6', 'm22 7-8.5 8.5-5-5L2 17'],
  trophy: [
    'M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978', 'M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978',
    'M18 9h1.5a1 1 0 0 0 0-5H18', 'M4 22h16', 'M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z', 'M6 9H4.5a1 1 0 0 1 0-5H6',
  ],
}

/** A card's heading ("Rank ups"), with its lucide icon when it has one. Takes 24 + 12 px. */
function heading(ctx: Ctx, text: string, top: number, c: Colors, icon?: string[]) {
  let x = X0
  if (icon) {
    ctx.save()
    ctx.translate(X0, top + 3)
    ctx.scale(18 / 24, 18 / 24)
    ctx.strokeStyle = rgba(c.primary)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const d of icon) ctx.stroke(new Path2D(d))
    ctx.restore()
    x += 18 + 8
  }
  say(ctx, text, x, top, H2, rgba(c.fg))
}
const HEADING_H = 24 + 12

function ownerBlock(ctx: Ctx, owner: CardOwner, photo: HTMLImageElement | null, c: Colors): Block {
  const size = 40
  const logoSize = 24
  const nameX = GUTTER + size + 12
  const name = owner.name.trim()
  setType(ctx, { ...H2, size: 17 })
  const shown = fit(ctx, name, W - GUTTER - logoSize - 12 - nameX)
  return {
    height: size,
    draw(ctx, top) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(GUTTER + size / 2, top + size / 2, size / 2, 0, Math.PI * 2)
      if (photo) {
        ctx.clip()
        ctx.drawImage(photo, GUTTER, top, size, size)
      } else {
        const g = ctx.createLinearGradient(GUTTER, top, GUTTER + size, top + size)
        g.addColorStop(0, rgba(c.from))
        g.addColorStop(1, rgba(c.to))
        ctx.fillStyle = g
        ctx.fill()
        say(ctx, initials(name || '?'), GUTTER + size / 2, top, { size: size * 0.36, line: size, weight: 700, heading: true }, rgba(c.onPrimary), 'center')
      }
      ctx.restore()
      if (shown) say(ctx, shown, nameX, top, { ...H2, size: 17, line: size }, rgba(c.fg))
      logo(ctx, W - GUTTER - logoSize * 0.92, top + (size - logoSize) / 2, logoSize, rgba(c.primary), rgba(c.muted))
    },
  }
}

/** The summary page's own header: the day in small capitals, the workout's name. */
function titleBlock(ctx: Ctx, workout: WorkoutWithSets, c: Colors): Block {
  const day = format(parseISO(workout.date), 'EEEE, d MMMM').toUpperCase()
  setType(ctx, TITLE)
  const title = fit(ctx, workout.name?.trim() || 'Workout', W - GUTTER * 2)
  return {
    height: EYEBROW.line + TITLE.line,
    draw(ctx, top) {
      // tracking-[0.14em], a letter at a time (canvas letterSpacing isn't everywhere yet)
      setType(ctx, EYEBROW)
      let x = GUTTER
      for (const ch of day) {
        say(ctx, ch, x, top, EYEBROW, rgba(c.muted))
        x += ctx.measureText(ch).width + EYEBROW.size * 0.14
      }
      say(ctx, title, GUTTER, top + EYEBROW.line, TITLE, rgba(c.fg))
    },
  }
}

const paths = new Map<string, Path2D>()
function path(d: string): Path2D {
  let p = paths.get(d)
  if (!p) paths.set(d, (p = new Path2D(d)))
  return p
}

/** One body figure (as MusclesWorked draws it), `w` wide with its top left at (x, y). */
function figure(ctx: Ctx, shapes: Shape[], center: Shape[], level: Map<MuscleRegion, number>, x: number, y: number, w: number, c: Colors) {
  const k = w / 164 // the figures' viewBox: 18 4 164 412
  const paint = (d: string, fill: string, line: string, width: number) => {
    ctx.fillStyle = fill
    ctx.fill(path(d))
    ctx.strokeStyle = line
    ctx.lineWidth = width
    ctx.stroke(path(d))
  }
  const bothHalves = (draw: () => void) => {
    draw()
    ctx.save()
    ctx.transform(-1, 0, 0, 1, 200, 0)
    draw()
    ctx.restore()
  }
  ctx.save()
  ctx.translate(x - 18 * k, y - 4 * k)
  ctx.scale(k, k)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const s of center) paint(s.d, rgba(c.fg, 0.02), rgba(c.fg, c.bodyLine), 0.55)
  bothHalves(() => {
    for (const s of shapes) {
      const worked = s.region ? level.get(s.region) : undefined
      if (worked) paint(s.d, rgba(c.primary, MIN_ALPHA + (1 - MIN_ALPHA) * worked), rgba(c.primary, 0.9), 0.7)
      else paint(s.d, rgba(c.fg, s.region ? 0.05 : 0.02), rgba(c.fg, s.region ? c.muscleLine : c.bodyLine), 0.55)
    }
  })
  ctx.strokeStyle = rgba(c.fg, c.detailLine)
  ctx.lineWidth = 0.45
  for (const s of center) if (s.detail) ctx.stroke(path(s.detail))
  bothHalves(() => {
    for (const s of shapes) if (s.detail) ctx.stroke(path(s.detail))
  })
  ctx.restore()
}

/** "Muscles worked": the two figures, and the most worked named beside them with a bar each. */
function musclesBlock(ctx: Ctx, sets: WorkoutSetWithExercise[], c: Colors): Block | null {
  const work = musclesWorked(sets)
  if (work.size === 0) return null
  const most = Math.max(...work.values())
  const level = new Map([...work].map(([region, value]) => [region, value / most]))
  const ranked = [...work].sort((a, b) => b[1] - a[1])
  const listed = ranked.slice(0, LISTED)
  const more = ranked.length - listed.length
  const figuresW = INNER * 0.56
  const figW = (figuresW - 4) / 2
  const figH = figW * (412 / 164)
  const itemH = SM.line + 4 + 6
  const listH = listed.length * itemH + (listed.length - 1) * 10 + (more > 0 ? 10 + XS.line : 0)
  const rowH = Math.max(figH, listH)
  const listX = X0 + figuresW + 16
  const listW = X0 + INNER - listX
  setType(ctx, SM, 500)
  const names = listed.map(([region]) => fit(ctx, REGION_LABEL[region], listW))
  return {
    height: XS.line + 12 + rowH,
    draw(ctx, top) {
      say(ctx, 'Muscles worked', X0, top, XS, rgba(c.muted))
      const rowTop = top + XS.line + 12
      figure(ctx, FRONT, CENTER_FRONT, level, X0, rowTop + (rowH - figH) / 2, figW, c)
      figure(ctx, BACK, CENTER_BACK, level, X0 + figW + 4, rowTop + (rowH - figH) / 2, figW, c)
      let y = rowTop + (rowH - listH) / 2
      listed.forEach(([, value], i) => {
        say(ctx, names[i], listX, y, SM, rgba(c.fg), 'left', 500)
        const barY = y + SM.line + 4
        ctx.beginPath()
        ctx.roundRect(listX, barY, listW, 6, 3)
        ctx.fillStyle = rgba(c.fg, 0.1)
        ctx.fill()
        ctx.beginPath()
        ctx.roundRect(listX, barY, listW * Math.max(0.08, value / most), 6, 3)
        ctx.fillStyle = rgba(c.primary)
        ctx.fill()
        y += itemH + 10
      })
      if (more > 0) say(ctx, `+${more} more`, listX, y, XS, rgba(c.muted))
    },
  }
}

/** The "Workout Summary" card: its figures two to a row, then the body map. */
function summaryBlock(ctx: Ctx, workout: WorkoutWithSets, c: Colors): Block {
  const col = (INNER - 24) / 2
  const VALUE: Type = { size: 18, line: 28, weight: 500 }
  setType(ctx, SM)
  const cells = summaryStats(workout).map(([label, value]) => ({ label: wrap(ctx, label, col, 3), value }))
  const cellH = (cell: (typeof cells)[number]) => cell.label.length * SM.line + 4 + VALUE.line
  const rows: { cells: typeof cells; height: number }[] = []
  for (let i = 0; i < cells.length; i += 2) {
    const row = cells.slice(i, i + 2)
    rows.push({ cells: row, height: Math.max(...row.map(cellH)) })
  }
  const gridH = rows.reduce((h, r) => h + r.height, 0) + 20 * (rows.length - 1)
  const muscles = musclesBlock(ctx, workout.sets, c)
  return cardBlock({
    height: 28 + 20 + gridH + (muscles ? 24 + muscles.height : 0),
    draw(ctx, top) {
      say(ctx, 'Workout Summary', W / 2, top, { size: 20, line: 28, weight: 600, heading: true }, rgba(c.fg), 'center')
      let y = top + 28 + 20
      for (const row of rows) {
        row.cells.forEach((cell, i) => {
          const x = X0 + i * (col + 24)
          cell.label.forEach((line, j) => say(ctx, line, x, y + j * SM.line, SM, rgba(c.muted)))
          say(ctx, cell.value, x, y + cell.label.length * SM.line + 4, VALUE, rgba(c.fg))
        })
        y += row.height + 20
      }
      if (muscles) muscles.draw(ctx, y - 20 + 24)
    },
  // On dark themes the screen draws this card darker than the others (bg-black/60)
  }, c.dark ? 'rgba(0, 0, 0, 0.6)' : rgba(c.card), rgba(c.fg, 0.05))
}

/** "Rank ups": each one's emblem, name ("New tier" when it is one) and from → to. */
function rankUpsBlock(ups: RankUp[], badges: (HTMLImageElement | null)[], c: Colors): Block | null {
  if (ups.length === 0) return null
  const sizeOf = (u: RankUp) => (u.id === 'overall' ? 60 : 46)
  const textH = BASE.line + SM.line
  const rowH = (u: RankUp) => Math.max(sizeOf(u), textH)
  const height = HEADING_H + ups.reduce((h, u) => h + rowH(u), 0) + 12 * (ups.length - 1)
  return cardBlock({
    height,
    draw(ctx, top) {
      heading(ctx, 'Rank ups', top, c, ICONS.trendingUp)
      let y = top + HEADING_H
      ups.forEach((u, i) => {
        const size = sizeOf(u)
        const h = rowH(u)
        const tier = rgba(mix(hex(u.to.tier.color), c.fg, c.ink))
        const badge = badges[i]
        if (badge) {
          // badgeImage pads its 100-unit artboard to 120, for the parts that reach past it
          const glow = BADGES[u.to.tier.key].pal.glow
          ctx.save()
          if (glow) {
            ctx.shadowColor = rgba(hex(glow), c.badgeGlow)
            ctx.shadowBlur = (size / 9) * ctx.getTransform().a
          }
          ctx.drawImage(badge, X0 - size * 0.1, y + (h - size) / 2 - size * 0.1, size * 1.2, size * 1.2)
          ctx.restore()
        }
        const tx = X0 + size + 12
        const tw = X0 + INNER - tx
        const textTop = y + (h - textH) / 2
        const newTier = !!u.from && u.from.tier.key !== u.to.tier.key
        const PILL: Type = { size: 10, line: 15, weight: 700 }
        const pillW = newTier ? measure(ctx, 'NEW TIER', PILL) + 16 : 0
        setType(ctx, BASE, 600)
        const name = fit(ctx, u.id === 'overall' ? 'Overall rank' : u.name, tw - (pillW ? pillW + 8 : 0))
        say(ctx, name, tx, textTop, BASE, rgba(c.fg), 'left', 600)
        if (newTier) {
          const px = tx + measure(ctx, name, BASE, 600) + 8
          const py = textTop + (BASE.line - 19) / 2
          ctx.beginPath()
          ctx.roundRect(px, py, pillW, 19, 9.5)
          ctx.fillStyle = rgba(hex(u.to.tier.color), 0.15)
          ctx.fill()
          say(ctx, 'NEW TIER', px + 8, py + 2, PILL, tier)
        }
        const lead = u.from ? `${u.from.label} → ` : 'Ranked '
        say(ctx, lead, tx, textTop + BASE.line, SM, rgba(c.muted))
        say(ctx, u.to.label, tx + measure(ctx, lead, SM), textTop + BASE.line, SM, tier, 'left', 600)
        y += h + 12
      })
    },
  }, rgba(c.card))
}

/** "New bests": the exercise, then "est. 1RM 63.1 → 68.9 kg". */
function bestsBlock(bests: NewBest[], c: Colors): Block | null {
  if (bests.length === 0) return null
  return cardBlock({
    height: HEADING_H + bests.length * SM.line + 8 * (bests.length - 1),
    draw(ctx, top) {
      heading(ctx, 'New bests', top, c, ICONS.trophy)
      bests.forEach((b, i) => {
        const y = top + HEADING_H + i * (SM.line + 8)
        const d = describeBest(b)
        const lead = `${d.label} ${d.from} → `
        const toW = measure(ctx, d.to, SM, 600)
        const leadW = measure(ctx, lead, SM)
        say(ctx, d.to, X0 + INNER, y, SM, rgba(c.fg), 'right', 600)
        say(ctx, lead, X0 + INNER - toW, y, SM, rgba(c.muted), 'right')
        setType(ctx, SM)
        say(ctx, fit(ctx, b.exerciseName, INNER - toW - leadW - 12), X0, y, SM, rgba(c.fg))
      })
    },
  }, rgba(c.card))
}

/** "Exercises": each one's name over its sets, wrapped between sets rather than inside one. */
function exercisesBlock(ctx: Ctx, sets: WorkoutSetWithExercise[], lb: ReadonlySet<string>, c: Colors): Block | null {
  const groups = new Map<string, WorkoutSetWithExercise[]>()
  for (const s of sets) groups.set(s.exerciseId, [...(groups.get(s.exerciseId) ?? []), s])
  if (groups.size === 0) return null
  setType(ctx, SM)
  const sep = ' · '
  const items = [...groups.values()].map(group => {
    const parts = group.map(s => describeSet(s, s.exercise, lb.has(s.exerciseId) ? 'lb' : 'kg', true))
    const lines: string[] = []
    for (const part of parts) {
      const last = lines[lines.length - 1]
      if (last !== undefined && ctx.measureText(last + sep + part).width <= INNER) lines[lines.length - 1] = last + sep + part
      else lines.push(fit(ctx, part, INNER))
    }
    return { name: group[0].exercise.name, lines, height: BASE.line + 2 + lines.length * SM.line }
  })
  setType(ctx, BASE)
  const names = items.map(item => fit(ctx, item.name, INNER))
  return cardBlock({
    height: HEADING_H + items.reduce((h, item) => h + item.height, 0) + 25 * (items.length - 1),
    draw(ctx, top) {
      heading(ctx, 'Exercises', top, c)
      let y = top + HEADING_H
      items.forEach((item, i) => {
        if (i > 0) {
          ctx.fillStyle = rgba(c.fg, 0.05)
          ctx.fillRect(X0, y + 12, INNER, 1)
          y += 25
        }
        say(ctx, names[i], X0, y, BASE, rgba(c.fg))
        item.lines.forEach((line, j) => say(ctx, line, X0, y + BASE.line + 2 + j * SM.line, SM, rgba(c.muted)))
        y += item.height
      })
    },
  }, rgba(c.card))
}

export async function renderWorkoutCard(share: WorkoutShare, owner: CardOwner): Promise<Blob> {
  const { workout, bests, rankUps, lb } = share
  await Promise.all([
    document.fonts.load(`700 24px ${HEADING}`),
    document.fonts.load(`500 16px ${BODY}`),
  ]).catch(() => {})
  const c = readColors()
  const [photo, badges] = await Promise.all([
    owner.avatar ? loadImage(owner.avatar) : null,
    // Emblems drawn at the size they'll have on the image, so they stay sharp
    Promise.all(rankUps.map(u => badgeImage(u.to.tier.key, Math.ceil((u.id === 'overall' ? 60 : 46) * 1.2 * (OUT_W / W))).catch(() => null))),
  ])

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser can’t draw images')
  const blocks = [
    ownerBlock(ctx, owner, photo, c),
    titleBlock(ctx, workout, c),
    summaryBlock(ctx, workout, c),
    rankUpsBlock(rankUps, badges, c),
    bestsBlock(bests, c),
    exercisesBlock(ctx, workout.sets, lb, c),
  ].filter((b): b is Block => b !== null)
  const height = TOP + blocks.reduce((h, b) => h + b.height, 0) + GAP * (blocks.length - 1) + 28

  const scale = Math.min(OUT_W / W, Math.sqrt(MAX_PX / (W * height)))
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(height * scale)
  ctx.scale(scale, scale)
  ctx.fillStyle = rgba(c.bg)
  ctx.fillRect(0, 0, W, height)
  let y = TOP
  for (const b of blocks) {
    b.draw(ctx, y)
    y += b.height + GAP
  }
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Couldn’t make the image'))), 'image/png'))
}
