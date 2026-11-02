import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { db } from '@/db'
import { requestSync } from '@/lib/sync'
import { round1 } from '@/lib/format'
import { isAndroidApp } from '@/lib/native'
import type { Food, MealType } from '@/types'
import { normalUnit } from './foodAmount'

/**
 * The owner's school cafeteria, from its Nutrislice menu (November 2026, the owner's call): today's
 * menu by dining hall, meal and station, logged in a tap. Nutrislice's API sends no CORS headers, so
 * the Android app reads it through Capacitor's native HTTP (`CapacitorHttp`, in every APK) and the
 * feature exists only there. Nutrislice's terms forbid automating access to it; the owner chose this
 * for personal use knowing that, so keep it light (one request per hall, meal and week, cached) and
 * expect it to stop working if they change or block the API.
 */
const API = 'https://lawerence.api.nutrislice.com/menu/api/weeks/school'
export const HALLS = [
  { slug: 'test-main-dining-area', name: "Andrew's Commons", short: "Andrew's" },
  { slug: 'world-market', name: "Kaplan's Cafe", short: "Kaplan's" },
] as const
export type Hall = (typeof HALLS)[number]['slug']
export type CafeMeal = 'breakfast' | 'lunch' | 'dinner'

export interface CafeItem {
  id: number
  name: string
  station: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  servingSize: number
  servingUnit: string
}
export interface CafeStation { name: string; items: CafeItem[] }
type Week = Record<string, CafeStation[]>

/** The menu is only offered where it can be read: the Android app. */
export const cafeteriaAvailable = isAndroidApp

/** The meal the dialog was opened for, or for a snack the one the clock is nearest. */
export function cafeMealFor(meal: MealType, now: Date): CafeMeal {
  if (meal !== 'snack') return meal
  const minutes = now.getHours() * 60 + now.getMinutes()
  return minutes < 10 * 60 + 30 ? 'breakfast' : minutes < 16 * 60 ? 'lunch' : 'dinner'
}

const HALL_KEY = 'solo:cafeHall'
export function lastHall(): Hall {
  try {
    const saved = localStorage.getItem(HALL_KEY)
    return HALLS.find(h => h.slug === saved)?.slug ?? HALLS[0].slug
  } catch {
    return HALLS[0].slug
  }
}
export function rememberHall(hall: Hall): void {
  try {
    localStorage.setItem(HALL_KEY, hall)
  } catch {
    // storage unavailable: the first hall next time
  }
}

// ── Reading the menu (untrusted: every field is checked and capped) ───────

// Numbers arrive as numbers or as numeric text (the serving size is "21.1")
function num(v: unknown, max: number): number | null {
  const n = typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max ? n : null
}
const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** One week of a Nutrislice menu as stations of foods per day; foods without calories are left out. */
export function parseWeek(raw: unknown): Week {
  const days = (raw as { days?: unknown } | null)?.days
  if (!Array.isArray(days)) throw new Error('The menu came back in a shape this app does not know')
  const week: Week = {}
  for (const day of days) {
    const date = text((day as { date?: unknown })?.date, 10)
    const rows = (day as { menu_items?: unknown })?.menu_items
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(rows)) continue
    const stations: CafeStation[] = []
    const seen = new Set<number>()
    let station: CafeStation | null = null
    for (const row of rows as Record<string, unknown>[]) {
      if (row?.is_station_header || row?.is_section_title) {
        station = { name: text(row.text, 60) || 'Menu', items: [] }
        stations.push(station)
        continue
      }
      const food = row?.food as Record<string, unknown> | null | undefined
      const id = num(food?.id, Number.MAX_SAFE_INTEGER)
      const name = text(food?.name, 120)
      const n = (food?.rounded_nutrition_info ?? {}) as Record<string, unknown>
      const kcal = num(n.calories, 5000)
      if (id == null || !name || kcal == null || seen.has(id)) continue
      seen.add(id)
      if (!station) {
        station = { name: 'Menu', items: [] }
        stations.push(station)
      }
      const serving = (food?.serving_size_info ?? {}) as Record<string, unknown>
      const amount = num(serving.serving_size_amount ?? row.serving_size_amount, 10_000)
      const unit = text(serving.serving_size_unit ?? row.serving_size_unit, 20)
      station.items.push({
        id,
        name,
        station: station.name,
        kcal: Math.round(kcal),
        protein: round1(num(n.g_protein, 500) ?? 0),
        carbs: round1(num(n.g_carbs, 500) ?? 0),
        fat: round1(num(n.g_fat, 500) ?? 0),
        servingSize: amount && unit ? amount : 1,
        servingUnit: amount && unit ? normalUnit(unit) : 'serving',
      })
    }
    week[date] = stations.filter(s => s.items.length > 0)
  }
  return week
}

// ── Fetching, with the week kept on the phone ─────────────────────────────

const FRESH_MS = 6 * 60 * 60 * 1000
const weeks = new Map<string, { at: number; week: Week }>()

function weekKey(hall: Hall, meal: CafeMeal, date: string): string {
  return `solo:cafe:${hall}:${meal}:${format(startOfWeek(parseISO(date)), 'yyyy-MM-dd')}`
}

function cached(key: string): { at: number; week: Week } | null {
  const inMemory = weeks.get(key)
  if (inMemory) return inMemory
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return null
    const parsed = JSON.parse(saved) as { at: number; week: Week }
    weeks.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

function keep(key: string, week: Week): void {
  const entry = { at: Date.now(), week }
  weeks.set(key, entry)
  try {
    // Menus from before last week are dropped (each key ends with its week's Sunday)
    const oldest = format(addDays(startOfWeek(new Date()), -7), 'yyyy-MM-dd')
    for (const k of Object.keys(localStorage)) if (k.startsWith('solo:cafe:') && k.slice(-10) < oldest) localStorage.removeItem(k)
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // storage full or unavailable: the menu is fetched again next time
  }
}

async function fetchWeek(hall: Hall, meal: CafeMeal, date: string): Promise<Week> {
  const [y, m, d] = date.split('-')
  // Imported here, so it never loads outside the app; its plugin object is only ever called, never returned
  const { CapacitorHttp } = await import('@capacitor/core')
  const res = await CapacitorHttp.get({
    url: `${API}/${hall}/menu-type/${meal}/${y}/${m}/${d}/`,
    headers: { accept: 'application/json' },
    connectTimeout: 10_000,
    readTimeout: 20_000,
  })
  if (res.status !== 200) throw new Error(`The cafeteria's menu answered ${res.status}`)
  return parseWeek(typeof res.data === 'string' ? JSON.parse(res.data) : res.data)
}

/** A day's menu for one hall and meal: from the phone if fetched in the last 6 hours, else fresh (the last copy if that fails). */
export async function cafeteriaMenu(hall: Hall, meal: CafeMeal, date: string): Promise<CafeStation[]> {
  const key = weekKey(hall, meal, date)
  const saved = cached(key)
  if (saved && Date.now() - saved.at < FRESH_MS) return saved.week[date] ?? []
  try {
    const week = await fetchWeek(hall, meal, date)
    keep(key, week)
    return week[date] ?? []
  } catch (err) {
    if (saved) return saved.week[date] ?? []
    throw err
  }
}

/**
 * The food behind a menu item, saved as one of the user's own (`nutrislice-<id>`, synced) the first
 * time it's picked, so it's in Recent and "Same as yesterday" afterwards. One saved before is used
 * as it was: past days add up from its numbers, so a later change on the menu doesn't rewrite them.
 */
export async function cafeteriaFood(item: CafeItem, hall: Hall): Promise<Food> {
  const uuid = `nutrislice-${item.id}`
  const existing = await db.foods.get(uuid)
  if (existing && !existing.removed) return existing
  const food: Food = {
    uuid,
    name: item.name,
    kcalPerServing: item.kcal,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    servingSize: item.servingSize,
    servingUnit: item.servingUnit,
    isCustom: true,
    isFavorite: existing?.isFavorite ?? false,
    notes: `${HALLS.find(h => h.slug === hall)?.name ?? 'Cafeteria'} · ${item.station}`,
    updatedAt: Date.now(),
    syncPending: true,
  }
  await db.foods.put(food)
  requestSync()
  return food
}
