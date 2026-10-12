import { format, parseISO } from 'date-fns'
import type { WeightUnit, WorkoutSetWithExercise, WorkoutWithSets } from '@/types'
import { formatDurationMin } from '@/lib/format'
import { est1RM, formatVolume, totalVolume } from '@/lib/workoutMath'
import { formatKm, formatPace } from '@/lib/cardio'
import { REGION_LABEL } from '@/features/ranks/standards'
import type { RankUp } from '@/features/ranks/computeRanks'
import {
  CARD_W, FG, FOOTER_Y, MUTED, PAD, drawHeader, drawHeading, drawRankRow, drawTiles, finishCard, fit, font, startCard,
  type CardColors, type CardOwner, type Ctx, type Tile,
} from '@/features/share/card'
import type { NewBest } from './hooks/useWorkoutHistory'
import { describeSet } from './describeSet'
import { musclesWorked } from './musclesWorked'

/**
 * One workout as a picture for the group chat (drawing in features/share/card.ts): what was
 * trained, how long, how much, its biggest rank-up and every exercise with its best set, new
 * bests marked. Its notes and heart rate stay off it.
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

function byExercise(sets: WorkoutSetWithExercise[]): WorkoutSetWithExercise[][] {
  const groups = new Map<string, WorkoutSetWithExercise[]>()
  for (const s of sets) groups.set(s.exerciseId, [...(groups.get(s.exerciseId) ?? []), s])
  return [...groups.values()]
}

/** "3 sets · 84×8" (the best by est. 1RM), "2 sets · 30 reps", "31 min · 5.6 km · 5:32 /km". */
function detail(sets: WorkoutSetWithExercise[], unit: WeightUnit): string {
  const exercise = sets[0].exercise
  if (exercise.type === 'cardio') {
    const s = sets.reduce((a, b) => ((b.duration ?? 0) > (a.duration ?? 0) ? b : a))
    return [s.duration ? `${s.duration} min` : '', s.distanceKm ? formatKm(s.distanceKm) : '', formatPace(exercise.uuid, s) ?? ''].filter(Boolean).join(' · ') || '—'
  }
  const score = (s: WorkoutSetWithExercise) => (s.weight && s.reps ? est1RM(s.weight, s.reps) * 1000 : (s.reps ?? 0) + (s.duration ?? 0))
  const best = sets.reduce((a, b) => (score(b) > score(a) ? b : a))
  return `${plural(sets.length, 'set')} · ${describeSet(best, exercise, unit, true)}`
}

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

function tiles(workout: WorkoutWithSets): Tile[] {
  const lifts = workout.sets.filter(s => s.exercise.type !== 'cardio')
  const cardio = workout.sets.filter(s => s.exercise.type === 'cardio')
  const volume = totalVolume(lifts)
  const km = cardio.reduce((n, s) => n + (s.distanceKm ?? 0), 0)
  const out: Tile[] = [{ value: formatDurationMin(workout.durationMin), label: 'Duration' }]
  if (volume > 0) out.push({ value: formatVolume(volume), label: 'Lifted' })
  if (km > 0) out.push({ value: formatKm(km), label: 'Distance' })
  if (lifts.length) out.push({ value: String(lifts.length), label: lifts.length === 1 ? 'Set' : 'Sets' })
  const run = cardio.find(s => s.distanceKm)
  const pace = run && formatPace(run.exerciseId, run)
  if (pace) out.push({ value: pace.replace(/ \/km$/, ''), label: pace.endsWith('/km') ? 'Pace /km' : 'Pace' })
  out.push({ value: String(new Set(workout.sets.map(s => s.exerciseId)).size), label: 'Exercises' })
  return out.slice(0, 3)
}

/** The rank-up to show: the overall one, else the highest rank reached. */
function topRankUp(ups: RankUp[]): RankUp | null {
  return ups.find(u => u.id === 'overall') ?? ups.reduce<RankUp | null>((a, u) => (!a || u.to.rating > a.to.rating ? u : a), null)
}

function pill(ctx: Ctx, colors: CardColors, text: string, right: number, baseline: number): number {
  font(ctx, 700, 18)
  const w = ctx.measureText(text).width + 22
  ctx.beginPath()
  ctx.roundRect(right - w, baseline - 24, w, 32, 16)
  ctx.fillStyle = colors.accent
  ctx.fill()
  ctx.fillStyle = colors.onBrand
  ctx.fillText(text, right - w + 11, baseline - 2)
  return w
}

export async function renderWorkoutCard(share: WorkoutShare, owner: CardOwner): Promise<Blob> {
  const { workout, bests, rankUps, lb } = share
  const { canvas, ctx, colors } = await startCard()
  const first = owner.name.split(/\s+/)[0]
  const top = [...musclesWorked(workout.sets)].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([region]) => REGION_LABEL[region])
  let y = await drawHeader(ctx, colors, owner, {
    title: workout.name?.trim() || 'Workout',
    subtitle: [first, format(parseISO(workout.date), 'EEEE d MMMM yyyy')].filter(Boolean).join(' · '),
    headline: workoutHeadline(share),
    note: top.length ? top.join(' · ') : undefined,
  })
  y = drawTiles(ctx, y, tiles(workout), 3)

  const up = topRankUp(rankUps)
  if (up) {
    const more = rankUps.length - 1
    const note = `${up.from ? `Up from ${up.from.label}` : 'First rank'}${more > 0 ? ` · ${plural(more, 'more rank-up')}` : ''}`
    y = await drawRankRow(ctx, y, { eyebrow: up.id === 'overall' ? 'OVERALL RANK UP' : `RANK UP · ${up.name.toUpperCase()}`, rank: up.to, note })
  }

  // Every exercise with its best set, as many as fit above the footer
  const groups = byExercise(workout.sets)
  const rowH = 50
  const bottom = FOOTER_Y - 40
  if (groups.length && y + 60 + rowH <= bottom) {
    drawHeading(ctx, y, 'Exercises', groups.length, colors.accent)
    y += 64
    const room = Math.floor((bottom - y) / rowH)
    const shown = groups.length > room ? groups.slice(0, Math.max(0, room - 1)) : groups
    const newBest = new Set(bests.map(b => b.exerciseId))
    for (const sets of shown) {
      const id = sets[0].exerciseId
      const text = detail(sets, lb.has(id) ? 'lb' : 'kg')
      font(ctx, 500, 28)
      const tw = ctx.measureText(text).width
      ctx.fillStyle = newBest.has(id) ? colors.accent : MUTED
      ctx.fillText(text, CARD_W - PAD - tw, y + 36)
      const pw = newBest.has(id) ? pill(ctx, colors, 'NEW BEST', CARD_W - PAD - tw - 14, y + 36) + 14 : 0
      ctx.fillStyle = FG
      font(ctx, 600, 30)
      ctx.fillText(fit(ctx, sets[0].exercise.name, CARD_W - PAD * 2 - tw - pw - 28), PAD, y + 36)
      y += rowH
    }
    if (shown.length < groups.length) {
      ctx.fillStyle = MUTED
      font(ctx, 500, 28)
      ctx.fillText(`+ ${plural(groups.length - shown.length, 'more exercise')}`, PAD, y + 36)
    }
  }
  return finishCard(canvas, ctx, colors)
}
