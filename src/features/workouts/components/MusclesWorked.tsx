import type { ReactNode } from 'react'
import type { WorkoutSetWithExercise } from '@/types'
import { REGION_LABEL, type MuscleRegion } from '@/features/ranks/standards'
import { BACK, BODY_FILL, BODY_LINE, CENTER_BACK, CENTER_FRONT, FRONT, HALVES, MUSCLE_FILL, MUSCLE_LINE, VIEWBOX, bodyInk, type Shape } from '@/features/ranks/components/bodygraphShapes'
import { LISTED, MIN_ALPHA, musclesWorked } from '../musclesWorked'

const accent = (alpha: number) => `hsl(var(--primary) / ${alpha})`

interface FigureProps {
  label: string
  shapes: Shape[]
  center: Shape[]
  /** 0–1 per worked region, 1 = the most worked. */
  level: Map<MuscleRegion, number>
}

function Figure({ label, shapes, center, level }: FigureProps) {
  const both = (render: () => ReactNode) =>
    HALVES.map(transform => <g key={transform ?? 'left'} transform={transform}>{render()}</g>)

  return (
    <svg viewBox={VIEWBOX} className="h-auto w-full" role="img" aria-label={`${label} view`}>
      {center.map((s, i) => <path key={i} d={s.d} fill={BODY_FILL} stroke={BODY_LINE} strokeWidth={0.55} />)}
      {both(() => shapes.map((s, i) => {
        const worked = s.region ? level.get(s.region) : undefined
        return worked
          ? <path key={i} d={s.d} fill={accent(MIN_ALPHA + (1 - MIN_ALPHA) * worked)} stroke={accent(0.9)} strokeWidth={0.7} strokeLinejoin="round" />
          : <path key={i} d={s.d} fill={s.region ? MUSCLE_FILL : BODY_FILL} stroke={s.region ? MUSCLE_LINE : BODY_LINE} strokeWidth={0.55} strokeLinejoin="round" />
      }))}
      <g fill="none" strokeWidth={0.45} strokeLinecap="round" stroke={bodyInk('var(--detail-line)')}>
        {center.filter(s => s.detail).map((s, i) => <path key={i} d={s.detail} />)}
        {both(() => shapes.filter(s => s.detail).map((s, i) => <path key={i} d={s.detail} />))}
      </g>
    </svg>
  )
}

/**
 * The muscles a workout worked, on the body: the more sets a muscle took, the stronger it's
 * filled in, and the most worked are named beside it. Nothing shows for a workout whose
 * exercises name no muscles.
 */
export default function MusclesWorked({ sets }: { sets: WorkoutSetWithExercise[] }) {
  const work = musclesWorked(sets)
  if (work.size === 0) return null

  const most = Math.max(...work.values())
  const level = new Map([...work].map(([region, value]) => [region, value / most]))
  const ranked = [...work].sort((a, b) => b[1] - a[1])

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">Muscles worked</p>
      <div className="flex items-center gap-4">
        <div className="grid w-[56%] shrink-0 grid-cols-2 gap-1">
          <Figure label="Front" shapes={FRONT} center={CENTER_FRONT} level={level} />
          <Figure label="Back" shapes={BACK} center={CENTER_BACK} level={level} />
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
          {ranked.slice(0, LISTED).map(([region, value]) => (
            <li key={region}>
              <p className="truncate text-sm font-medium">{REGION_LABEL[region]}</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (value / most) * 100)}%` }} />
              </div>
            </li>
          ))}
          {ranked.length > LISTED && <li className="text-xs text-muted-foreground">+{ranked.length - LISTED} more</li>}
        </ul>
      </div>
    </div>
  )
}
