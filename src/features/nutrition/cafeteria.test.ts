import { describe, expect, it } from 'vitest'
import { parseWeek } from './cafeteria'

const item = (id: unknown, name: unknown, calories: unknown, extra: Record<string, unknown> = {}) => ({
  food: { id, name, rounded_nutrition_info: { calories, g_protein: 10, g_carbs: '20', g_fat: 5 }, serving_size_info: { serving_size_amount: '3.5', serving_size_unit: 'oz' }, ...extra },
})

describe('parseWeek (Nutrislice menus are untrusted)', () => {
  it('reads stations and foods, numbers sent as text included', () => {
    const week = parseWeek({ days: [{ date: '2026-11-02', menu_items: [{ is_station_header: true, text: 'Grill' }, item(1, 'Burger', 650)] }] })
    expect(week['2026-11-02']).toEqual([
      { name: 'Grill', items: [{ id: 1, name: 'Burger', station: 'Grill', kcal: 650, protein: 10, carbs: 20, fat: 5, servingSize: 3.5, servingUnit: 'oz' }] },
    ])
  })

  it('refuses a shape it doesn’t know', () => {
    expect(() => parseWeek({ nope: [] })).toThrow()
    expect(() => parseWeek(null)).toThrow()
  })

  it('drops bad rows and days, caps lengths, and keeps each food once', () => {
    const week = parseWeek({
      days: [
        { date: 'not a date', menu_items: [item(1, 'Burger', 650)] },
        {
          date: '2026-11-03',
          menu_items: [
            item(2, 'x'.repeat(500), 300),
            item(2, 'Duplicate', 300),
            item(3, 'No calories', null),
            item(4, 'Absurd', 999999),
            item('5; DROP TABLE', 'Bad id', 100),
          ],
        },
      ],
    })
    expect(Object.keys(week)).toEqual(['2026-11-03'])
    const foods = week['2026-11-03'].flatMap(s => s.items)
    expect(foods.map(f => f.id)).toEqual([2])
    expect(foods[0].name).toHaveLength(120)
  })
})
