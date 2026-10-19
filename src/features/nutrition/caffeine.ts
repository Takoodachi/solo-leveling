import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db'
import { toDateStr } from '@/lib/date'
import { useNow } from '@/hooks/useNow'

/**
 * Caffeine in the built-in foods, mg per serving (one of the food's own servings: a 240 ml cup,
 * a can, a grande). Not shown anywhere: it only feeds the warning below. Sources: USDA FoodData
 * Central (brewed coffee 40 mg/100 g, green tea 12 mg/100 g, 70–85% chocolate 80 mg/100 g), the
 * FDA's caffeine guidance (soft drinks, energy drinks), Starbucks' published figures for its
 * grande drinks, and published estimates for Vietnamese phin coffee, which is made with robusta
 * (about twice arabica's caffeine). Custom and scanned foods aren't counted: there's no caffeine
 * figure for them. Foods with a trace (milk chocolate, cookies) are left out.
 */
export const CAFFEINE_MG: Record<string, number> = {
  'food-black-coffee': 95, // 240 ml brewed
  'food-green-tea': 28, // 240 ml
  'food-coca-cola': 32, // 330 ml (34 mg per 12 oz)
  'food-diet-coke': 42, // 330 ml (46 mg per 12 oz)
  'food-dark-chocolate': 80, // 100 g, 70%
  'food-latte': 126, // 350 ml, two shots
  'food-cappuccino': 75, // 240 ml
  'food-energy-drink': 80, // 250 ml
  'food-sweet-iced-tea': 40, // 500 ml bottled
  'food-vn-ca-phe-sua-da': 150,
  'food-vn-bac-xiu': 80, // more milk, less coffee
  'food-vn-ca-phe-den': 150,
  'food-vn-ca-phe-muoi': 150,
  'food-vn-ca-phe-trung': 100,
  'food-vn-tra-sua': 70, // 500 ml bubble milk tea
  'food-vn-tra-tac': 40, // 500 ml
  'food-jp-matcha-latte': 70, // 350 ml, about 2 g of matcha
  'food-us-sbux-latte': 150,
  'food-us-sbux-caramel-mac': 150,
  'food-us-sbux-frapp': 90,
  'food-us-sbux-psl': 150,
  'food-us-sbux-shaken-esp': 255, // three shots
  'food-us-sbux-matcha': 80,
  'food-us-dr-pepper': 41,
}

/** The daily amount the FDA and EFSA give as safe for most healthy adults. */
export const CAFFEINE_LIMIT_MG = 400

export function caffeineOf(logs: { foodId: string; servings: number }[]): number {
  return logs.reduce((mg, l) => mg + (CAFFEINE_MG[l.foodId] ?? 0) * l.servings, 0)
}

/**
 * Mount once (App): when today's food log adds up to more caffeine than the daily limit, a
 * warning appears, once a day per device, whatever logged it. No counter is ever shown.
 */
export function useCaffeineWatch(ready: boolean): void {
  const day = toDateStr(useNow())
  const mg = useLiveQuery(async () => (ready ? caffeineOf(await db.foodLog.where('date').equals(day).toArray()) : 0), [ready, day])

  useEffect(() => {
    if (!mg || mg <= CAFFEINE_LIMIT_MG) return
    const key = `solo:caffeineWarned:${day}`
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
    } catch {
      // storage unavailable: it may warn again after a restart, which is fine
    }
    toast.warning('That’s a lot of caffeine today', {
      description: `About ${Math.round(mg / 10) * 10} mg so far, more than the ${CAFFEINE_LIMIT_MG} mg a day health agencies suggest for most adults.`,
      duration: 10_000,
    })
  }, [mg, day])
}
