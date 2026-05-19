import { create } from 'zustand'
import { today } from '@/lib/date'
import type { MealType } from '@/types'

interface NutritionStore {
  selectedDate: string
  activeMeal: MealType | null
  setDate: (date: string) => void
  setActiveMeal: (meal: MealType | null) => void
}

export const useNutritionStore = create<NutritionStore>(set => ({
  selectedDate: today(),
  activeMeal: null,
  setDate: (date) => set({ selectedDate: date }),
  setActiveMeal: (activeMeal) => set({ activeMeal }),
}))
