import { parseISO } from 'date-fns'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { daysBefore, resetDb } from '@/test/db'
import type { HomeWidgetId, Settings } from '@/types'
import { loadQuest } from './quest'

const now = Date.now()
const month = Array.from({ length: 28 }, (_, i) => daysBefore('2026-11-30', i))

async function seed(homeWidgets?: HomeWidgetId[]) {
  await db.settings.put({ id: 1, homeWidgets, updatedAt: now } as Settings)
  await db.targets.put({ id: 1, dailyKcal: 2400, dailyProtein: 150, dailyCarbs: 250, dailyFat: 70, updatedAt: now })
  await db.routines.put({ uuid: 'r', name: 'Push Day', category: 'strength', level: 'intermediate', exercises: [], scheduleDays: [1, 3], updatedAt: now })
  await db.bodyMetrics.put({ uuid: 'w', date: '2026-10-28', weightKg: 70, updatedAt: now })
  await db.checkins.put({ uuid: 'skip-2026-11-04', date: '2026-11-04', key: 'skip', done: true, updatedAt: now })
}

describe('loadQuest', () => {
  beforeEach(resetDb)

  it('is one objective of each kind, the same each time a day is asked', async () => {
    await seed()
    for (const date of month) {
      const quest = await loadQuest(date)
      expect(quest.objectives).toHaveLength(3)
      expect((await loadQuest(date)).objectives.map(o => o.id)).toEqual(quest.objectives.map(o => o.id))
    }
  })

  it('changes from day to day', async () => {
    await seed()
    const sets = new Set<string>()
    for (const date of month) sets.add((await loadQuest(date)).objectives.map(o => o.id).join('+'))
    expect(sets.size).toBeGreaterThan(8)
  })

  it('asks for the planned routine only on a planned day that wasn’t skipped', async () => {
    await seed()
    for (const date of month) {
      const ids = (await loadQuest(date)).objectives.map(o => o.id)
      if (!ids.includes('workout')) continue
      expect([1, 3]).toContain(parseISO(date).getDay())
      expect(date).not.toBe('2026-11-04')
    }
  })

  it('leaves eating out for someone not tracking food, and is never about calories', async () => {
    await seed(['workout', 'steps', 'creatine', 'quest'])
    for (const date of month) {
      const quest = await loadQuest(date)
      expect(quest.objectives).toHaveLength(2)
      expect(quest.objectives.map(o => o.id).some(id => ['protein', 'food', 'meals', 'breakfast'].includes(id))).toBe(false)
      expect(quest.objectives.map(o => o.label).join(' ')).not.toMatch(/calorie|kcal/i)
    }
  })
})
