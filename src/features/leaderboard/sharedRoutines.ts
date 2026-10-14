import { db } from '@/db'
import type { Exercise, ExerciseType, RoutineExercise } from '@/types'
import { requestSync } from '@/lib/sync'
import { clamp } from '@/lib/utils'
import { EXERCISE_CATEGORIES } from '@/data/basics'
import { CATEGORIES, LEVELS } from '@/features/workouts/categories'
import { saveRoutine } from '@/features/workouts/hooks/useRoutines'
import { createCustomExercise } from '@/features/workouts/hooks/useExercises'
import type { SharedRoutine, SharedRoutineItem } from './types'

/**
 * Routines that travel in the leaderboard snapshot: a friend's arrive as whatever JSON their
 * device published, so everything read from one is checked and bounded here before it is shown
 * or copied (names cut to length, numbers clamped, anything unknown dropped or defaulted).
 */

const TYPES: readonly ExerciseType[] = ['strength', 'bodyweight', 'cardio', 'flexibility']
const UNITS: readonly Exercise['defaultUnit'][] = ['kg', 'lb', 'min', 'reps', 'km']
const ID = /^[\w-]{1,80}$/

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const whole = (v: unknown, low: number, high: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), [low, high]) : fallback
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback)

function cleanItem(raw: unknown): SharedRoutineItem[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as Record<string, unknown>
  const id = text(o.id, 80)
  if (!ID.test(id)) return []
  const item: SharedRoutineItem = { id, sets: whole(o.sets, 1, 20, 3), reps: whole(o.reps, 1, 300, 10), rest: whole(o.rest, 0, 900, 90) }
  if (o.ex && typeof o.ex === 'object') {
    const e = o.ex as Record<string, unknown>
    const name = text(e.name, 60)
    if (!name) return []
    item.ex = { name, category: oneOf(e.category, EXERCISE_CATEGORIES, 'Full Body'), type: oneOf(e.type, TYPES, 'strength'), unit: oneOf(e.unit, UNITS, 'kg') }
  }
  return [item]
}

/** A friend's routines, checked; whatever doesn't hold up is left out. */
export function cleanSharedRoutines(raw: unknown): SharedRoutine[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 30).flatMap((r): SharedRoutine[] => {
    if (!r || typeof r !== 'object') return []
    const o = r as Record<string, unknown>
    const id = text(o.id, 80)
    const name = text(o.name, 60)
    const items = Array.isArray(o.items) ? o.items.slice(0, 40).flatMap(cleanItem) : []
    if (!id || !name || items.length === 0) return []
    const days = Array.isArray(o.days) ? [...new Set(o.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))] : []
    const mins = whole(o.mins, 5, 300, 0)
    return [{
      id, name, items, days: days.sort((a, b) => a - b),
      category: oneOf(o.category, CATEGORIES, 'strength'),
      level: oneOf(o.level, LEVELS, 'intermediate'),
      ...(mins ? { mins } : {}),
    }]
  })
}

/** The exercise behind a shared item, on this device: one with that name and kind if there is one, else a new custom one. */
async function exerciseFor(item: SharedRoutineItem): Promise<string | null> {
  if (!item.ex) return (await db.exercises.get(item.id)) ? item.id : null // a built-in this device knows
  const { name, category, type, unit } = item.ex
  const same = await db.exercises.filter(e => e.name.toLowerCase() === name.toLowerCase() && e.type === type).first()
  return same?.uuid ?? (await createCustomExercise({ name, category, type, defaultUnit: unit })).uuid
}

/** Copy a friend's routine into your own; `withDays` keeps the weekdays it was planned on. Returns the copy's id. */
export async function addSharedRoutine(r: SharedRoutine, withDays = false): Promise<string> {
  const exercises: RoutineExercise[] = []
  for (const item of r.items) {
    const exerciseId = await exerciseFor(item)
    if (exerciseId) exercises.push({ exerciseId, sets: item.sets, reps: item.reps, restSec: item.rest })
  }
  const uuid = crypto.randomUUID()
  await saveRoutine({ uuid, name: r.name, category: r.category, level: r.level, estDurationMin: r.mins, exercises, scheduleDays: withDays ? r.days : [] })
  return uuid
}

/**
 * Take a friend's week as your own: their planned routines are copied onto their days, and
 * those days are freed in your plan (it holds one routine a day). Your routines all stay.
 */
export async function adoptWeek(routines: SharedRoutine[]): Promise<void> {
  const planned = routines.filter(r => r.days.length > 0)
  const taken = new Set(planned.flatMap(r => r.days))
  const now = Date.now()
  const mine = await db.routines.toArray()
  await db.routines.bulkPut(
    mine
      .filter(r => r.scheduleDays.some(d => taken.has(d)))
      .map(r => ({ ...r, scheduleDays: r.scheduleDays.filter(d => !taken.has(d)), updatedAt: now, syncPending: true })),
  )
  for (const r of planned) await addSharedRoutine(r, true)
  requestSync()
}
