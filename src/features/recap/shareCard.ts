import { formatDurationMin } from '@/lib/format'
import { formatVolume } from '@/lib/workoutMath'
import { drawHeader, drawHeading, drawRankRow, drawTiles, finishCard, fit, font, FG, FOOTER_Y, PAD, CARD_W, startCard, type CardOwner, type Tile } from '@/features/share/card'
import { headline } from './headline'
import { periodLabel } from './period'
import type { Recap } from './recap'

/**
 * The recap as a picture for the group chat (drawing in features/share/card.ts). Training,
 * steps, rank and new bests only: food and body weight stay private, as on the leaderboard.
 */

function stats(recap: Recap): Tile[] {
  const { training, steps } = recap
  const out: Tile[] = []
  if (training.workouts > 0) out.push({ value: String(training.workouts), label: training.workouts === 1 ? 'Workout' : 'Workouts' })
  if (training.activeMin > 0) out.push({ value: formatDurationMin(Math.round(training.activeMin)), label: 'Training time' })
  if (training.volume > 0) out.push({ value: formatVolume(training.volume), label: `Lifted in ${training.sets} sets` })
  if (steps.total > 0) out.push({ value: steps.total.toLocaleString(), label: 'Steps' })
  if (training.cardioKm > 0) out.push({ value: `${training.cardioKm.toFixed(1)} km`, label: 'Cardio' })
  return out.slice(0, 4)
}

export async function renderRecapCard(recap: Recap, owner: CardOwner, current: boolean): Promise<Blob> {
  const { canvas, ctx, colors } = await startCard()
  const first = owner.name.split(/\s+/)[0]
  let y = await drawHeader(ctx, colors, owner, {
    title: `${first ? `${first}’s` : 'My'} ${recap.period}`,
    subtitle: `${periodLabel(recap.period, recap.dates[0])}${current ? ' · so far' : ''}`,
    headline: headline(recap, { shared: true }),
  })
  y = drawTiles(ctx, y, stats(recap))

  if (recap.rank) {
    const { from: was, to: now } = recap.rank
    const up = !was || now.step > was.step
    const gained = was ? now.rating - was.rating : 0
    const note = up ? (was ? `Up from ${was.label}` : 'First overall rank') : gained > 0 ? `+${gained} rating` : 'Held'
    y = await drawRankRow(ctx, y, { eyebrow: 'OVERALL RANK', rank: now, note })
  }

  // New bests, as many as fit above the footer
  if (recap.bests.length && y + 120 < FOOTER_Y - 40) {
    drawHeading(ctx, y, 'New bests', recap.bests.length, colors.accent)
    y += 60
    for (const b of recap.bests) {
      if (y + 56 > FOOTER_Y - 40) break
      const value = `${b.from} → ${b.to} ${b.kind === '1rm' ? 'kg' : 'km'}`
      font(ctx, 600, 30)
      const vw = ctx.measureText(value).width
      ctx.fillStyle = FG
      ctx.fillText(fit(ctx, b.name, CARD_W - PAD * 2 - vw - 32), PAD, y + 40)
      ctx.fillStyle = colors.accent
      ctx.fillText(value, CARD_W - PAD - vw, y + 40)
      y += 56
    }
  }
  return finishCard(canvas, ctx, colors)
}
