import { create } from 'zustand'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Highlight } from './types'

/**
 * High-fives on friends' highlights (table `high_fives`). Quiet on purpose: the server allows
 * one per highlight, only between people on the leaderboard and at most 40 a day per sender,
 * and nothing is ever pushed. Each account reads only the ones it gave or got.
 */

/** What a high-five points at: one of its owner's highlights. */
export const highlightKey = (h: Pick<Highlight, 'kind' | 'name' | 'date'>) => `${h.kind}:${h.name}:${h.date}`.slice(0, 120)

export interface HighFive {
  from: string
  to: string
  key: string
  /** When the server took it (ISO). */
  at: string
}

interface Row { from_user: string; to_user: string; highlight: string; createdAt: string }

/** Highlights cover two weeks; one more is for a late look. */
const KEEP_DAYS = 21
const STALE_MS = 60_000
const inFlight = new Set<string>()

const same = (r: HighFive, from: string, to: string, key: string) => r.from === from && r.to === to && r.key === key
const without = (rows: HighFive[], from: string, to: string, key: string) => rows.filter(r => !same(r, from, to, key))

interface HighFiveStore {
  userId: string | null
  /** null until loaded, and while the table can't be read (offline, no migration): no buttons then. */
  rows: HighFive[] | null
  fetchedAt: number
  load: (userId: string, force?: boolean) => Promise<void>
  toggle: (to: string, key: string) => Promise<void>
}

export const useHighFiveStore = create<HighFiveStore>((set, get) => ({
  userId: null,
  rows: null,
  fetchedAt: 0,
  load: async (userId, force = false) => {
    if (get().userId !== userId) set({ userId, rows: null, fetchedAt: 0 })
    if (!force && Date.now() - get().fetchedAt < STALE_MS) return
    set({ fetchedAt: Date.now() })
    const since = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString()
    const { data, error } = await supabase.from('high_fives').select('from_user, to_user, highlight, createdAt').gte('createdAt', since)
    if (error) return console.warn('[high-fives] load failed:', error.message)
    set({ rows: (data as Row[]).map(r => ({ from: r.from_user, to: r.to_user, key: r.highlight, at: r.createdAt })) })
  },
  toggle: async (to, key) => {
    const { userId, rows } = get()
    const id = `${to}|${key}`
    if (!userId || !rows || inFlight.has(id)) return
    inFlight.add(id)
    const given = rows.some(r => same(r, userId, to, key))
    const mine = { from: userId, to, key, at: new Date().toISOString() }
    set({ rows: given ? without(rows, userId, to, key) : [...rows, mine] })
    const table = supabase.from('high_fives')
    const { error } = given
      ? await table.delete().eq('from_user', userId).eq('to_user', to).eq('highlight', key)
      : await table.upsert({ to_user: to, highlight: key }, { onConflict: 'from_user,to_user,highlight', ignoreDuplicates: true })
    inFlight.delete(id)
    if (!error) return
    const now = get().rows ?? []
    set({ rows: given ? [...now, mine] : without(now, userId, to, key) })
    toast.error(error.message.includes('limit') ? 'That’s a lot of high-fives for one day. More tomorrow.' : 'Couldn’t send that. Check the connection and try again.')
  },
}))

/** "Alex", "Alex and Sam", "Alex, Sam and 2 more". */
export function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(' and ')
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`
}

const seenKey = (userId: string) => `solo:highFivesSeen:${userId}`

/** The newest high-five already seen (ms of the server's time), so the digest doesn't repeat it. */
export function seenUntil(userId: string): number {
  try {
    return Number(localStorage.getItem(seenKey(userId))) || 0
  } catch {
    return 0
  }
}

/** Everything received so far counts as seen: the leaderboard is open, or the digest said it. */
export function markHighFivesSeen(userId: string, rows: HighFive[]): void {
  const newest = Math.max(seenUntil(userId), ...rows.filter(r => r.to === userId).map(r => Date.parse(r.at) || 0))
  try {
    localStorage.setItem(seenKey(userId), String(newest))
  } catch {
    // the digest may say it once more
  }
}
