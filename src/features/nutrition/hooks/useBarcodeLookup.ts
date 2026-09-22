import { useState } from 'react'
import { toast } from 'sonner'
import { db } from '@/db'
import type { Food } from '@/types'
import { lookupBarcode, type ScannedFood } from '../openFoodFacts'
import { barcodeFoodId } from './useFoods'

function fromSaved(barcode: string, food: Food): ScannedFood {
  return {
    barcode,
    name: food.name,
    amount: food.servingSize,
    unit: food.servingUnit === 'ml' ? 'ml' : 'g',
    values: { kcal: food.kcalPerServing, protein: food.protein, carbs: food.carbs, fat: food.fat },
    source: 'saved',
  }
}

/**
 * Barcode → reviewable result. A product scanned before opens with your saved
 * values (so a wrong entry can be corrected); otherwise it's fetched from Open Food Facts.
 */
export function useBarcodeLookup() {
  const [scan, setScan] = useState<ScannedFood | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  async function fetchRemote(code: string): Promise<ScannedFood | null> {
    try {
      const found = await lookupBarcode(code)
      if (!found) toast.error('Not in Open Food Facts yet', { description: 'Create it as a custom food from the label.' })
      return found
    } catch {
      toast.error('Couldn’t look up the barcode — check your connection')
      return null
    }
  }

  async function lookup(code: string): Promise<void> {
    setLookingUp(true)
    try {
      const saved = await db.foods.get(barcodeFoodId(code))
      setScan(saved ? fromSaved(code, saved) : await fetchRemote(code))
    } finally {
      setLookingUp(false)
    }
  }

  /** Replace a saved entry's values with a fresh database lookup (still reviewed before saving). */
  async function recheck(): Promise<void> {
    if (!scan) return
    setLookingUp(true)
    try {
      const found = await fetchRemote(scan.barcode)
      if (found) setScan(found)
    } finally {
      setLookingUp(false)
    }
  }

  return { scan, lookingUp, lookup, recheck, clear: () => setScan(null) }
}
