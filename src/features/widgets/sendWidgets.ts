import { db } from '@/db'
import { today } from '@/lib/date'
import { soloPlugin } from '@/lib/native'
import { routineMinutes } from '@/lib/workoutMath'
import type { Exercise, Routine } from '@/types'
import { calorieBudget, netKcal } from '@/features/dashboard/hooks/useCalorieBudget'
import { daySummaries } from '@/features/dashboard/hooks/useWeekSummary'
import { DEFAULT_STEP_GOAL, DEFAULT_WATER_GOAL_ML } from '@/features/settings/hooks/useSettings'
import { hslToHex } from '@/features/settings/themes'
import { computeRanks } from '@/features/ranks/computeRanks'
import { badgeImage } from '@/features/ranks/components/badgeImage'
import type { RankInfo } from '@/features/ranks/tiers'
import { useWorkoutStore } from '@/features/workouts/store'

/**
 * The Android app's home-screen widgets (android/…/Widgets.kt) are drawn natively from what this
 * sends: today's figures as Home shows them, today's workout and each weekday's routine (so a new
 * day shows its own before the app is opened), the overall rank with its emblem as a picture, and
 * the theme's colours. useWidgetSync decides when; nothing is sent that was sent last time.
 */

interface RoutineInfo {
  name: string
  exercises: number
  minutes: number
}

export interface WidgetData {
  date: string
  colors: Record<'card' | 'text' | 'muted' | 'accent' | 'onAccent' | 'secondary', string>
  /** Calories as Home counts them: eaten less what the day's steps burned. */
  kcal: { value: number; target: number }
  protein: { value: number; target: number }
  steps: { value: number; goal: number }
  water: { ml: number; goal: number }
  creatine: boolean
  workout: { routine: RoutineInfo | null; done: boolean; skipped: boolean; active: string | null }
  /** Each weekday's routine, Sunday first (as getDay counts). */
  week: (RoutineInfo | null)[]
  rank: { label: string; rating: number; color: string; progress: number; next: string | null; toNext: number } | null
}

/** "#rrggbb" of `a` mixed with `b`, `t` of the way to `a` (sRGB, close enough to the CSS's oklab). */
export function mixHex(a: string, b: string, t: number): string {
  const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  const [x, y] = [rgb(a), rgb(b)]
  return `#${x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join('')}`
}

function themeColors(): WidgetData['colors'] {
  const css = getComputedStyle(document.documentElement)
  const hex = (token: string) => hslToHex(css.getPropertyValue(`--${token}`).trim())
  return { card: hex('card'), text: hex('foreground'), muted: hex('muted-foreground'), accent: hex('primary'), onAccent: hex('primary-foreground'), secondary: hex('secondary') }
}

/** A tier's colour as its text reads on this theme (as `ink()` does: mixed toward the text on light themes). */
function inked(color: string, text: string): string {
  const keep = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ink'))
  return mixHex(color, text, Number.isFinite(keep) ? keep / 100 : 1)
}

function routineInfo(r: Routine | undefined, exercises: Map<string, Exercise>): RoutineInfo | null {
  if (!r) return null
  return { name: r.name, exercises: r.exercises.length, minutes: r.estDurationMin || routineMinutes(r.exercises, id => exercises.get(id)) }
}

async function build(): Promise<{ data: WidgetData; overall: RankInfo | null }> {
  const day = today()
  const [[summary], budget, settings, water, creatine, skip, routines, exercises, done, ranks] = await Promise.all([
    daySummaries([day]),
    calorieBudget(day),
    db.settings.get(1),
    db.checkins.get(`water-${day}`),
    db.checkins.get(`creatine-${day}`),
    db.checkins.get(`skip-${day}`),
    db.routines.toArray(),
    db.exercises.toArray(),
    db.workouts.where('date').equals(day).count(),
    computeRanks(),
  ])
  const byId = new Map(exercises.map(e => [e.uuid, e]))
  const week = Array.from({ length: 7 }, (_, d) => routineInfo(routines.find(r => r.scheduleDays.includes(d)), byId))
  const draft = useWorkoutStore.getState().draft
  const colors = themeColors()
  const overall = ranks.overall
  return {
    overall,
    data: {
      date: day,
      colors,
      kcal: { value: Math.round(netKcal(summary?.kcal ?? 0, budget.burn)), target: budget.targets.kcal },
      protein: { value: Math.round(summary?.protein ?? 0), target: budget.targets.protein },
      steps: { value: summary?.steps ?? 0, goal: settings?.dailyStepGoal ?? DEFAULT_STEP_GOAL },
      water: { ml: water?.amount ?? 0, goal: settings?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML },
      creatine: !!creatine?.done,
      workout: { routine: week[new Date().getDay()], done: done > 0, skipped: !!skip?.done, active: draft && !draft.editing ? draft.name : null },
      week,
      rank: overall && {
        label: overall.label,
        rating: overall.rating,
        color: inked(overall.tier.color, colors.text),
        progress: overall.progress,
        next: overall.nextLabel,
        toNext: overall.nextAt != null ? overall.nextAt - overall.rating : 0,
      },
    },
  }
}

/** The emblem as a PNG (base64), drawn the way the share card draws it. */
async function emblemPng(rank: RankInfo): Promise<string> {
  const size = 192
  const img = await badgeImage(rank.tier.key, size, rank.division)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas.getContext('2d')?.drawImage(img, 0, 0, size, size)
  return canvas.toDataURL('image/png').split(',')[1] ?? ''
}

let lastData = ''
let lastEmblem = ''

/** Sends what the widgets show, if it changed since last time (the emblem only when the rank's did). */
export async function sendWidgets(): Promise<void> {
  const plugin = await soloPlugin()
  if (!plugin) return
  const { data, overall } = await build()
  const json = JSON.stringify(data)
  const emblemKey = overall ? `${overall.tier.key}:${overall.division ?? ''}` : ''
  if (json === lastData && emblemKey === lastEmblem) return
  const emblem = overall && emblemKey !== lastEmblem ? await emblemPng(overall) : undefined
  await plugin.setWidgets({ data: json, emblem })
  lastData = json
  lastEmblem = emblemKey
}

/** For checking what would be sent, in a browser (no plugin there). */
export const widgetData = async () => (await build()).data
