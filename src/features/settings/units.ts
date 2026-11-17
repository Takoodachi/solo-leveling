import { useEffect } from 'react'
import { create } from 'zustand'
import type { HeightUnit, Settings, WeightUnit } from '@/types'
import { shownWeight, toKg } from '@/features/workouts/units'
import { useSettings } from './hooks/useSettings'

/**
 * The units weights and heights are shown and typed in (Settings → Units; November 2026, at the
 * owner's request): kg or lb for every weight, the body's and what's lifted, and cm or feet and
 * inches for height. What's stored doesn't change: kg and cm, whichever is chosen.
 *
 * A lift can still be logged in the other unit (the kg / lb switch on its card, `ExerciseNote.unit`):
 * its sets read in that unit wherever they're listed. Everything else is in the chosen one.
 */

export interface Units {
  weight: WeightUnit
  height: HeightUnit
}

/** The account's choice (unset = kg and cm). */
export const unitsOf = (s: Pick<Settings, 'weightUnit' | 'heightUnit'> | undefined): Units => ({
  weight: s?.weightUnit === 'lb' ? 'lb' : 'kg',
  height: s?.heightUnit === 'ftin' ? 'ftin' : 'cm',
})

const KEY = 'solo:units'

function stored(): Units {
  try {
    return unitsOf(JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? undefined)
  } catch {
    return unitsOf(undefined)
  }
}

/**
 * The units on show: `useUnits()` in a component, `useUnits.getState()` elsewhere (a share image,
 * a notification). It starts from this device's copy, so a launch's first screen is already in them.
 */
export const useUnits = create<Units>(stored)

/** Mount once (App): keeps `useUnits`, and this device's copy of it, in step with the account's settings. */
export function useUnitsSync(): void {
  const { settings } = useSettings()
  const loaded = !!settings
  const weightUnit = settings?.weightUnit
  const heightUnit = settings?.heightUnit
  useEffect(() => {
    if (!loaded) return // not read yet: the device's copy stands until they are
    const units = unitsOf({ weightUnit, heightUnit })
    useUnits.setState(units)
    try {
      localStorage.setItem(KEY, JSON.stringify({ weightUnit: units.weight, heightUnit: units.height }))
    } catch {
      // storage unavailable: this launch still has them
    }
  }, [loaded, weightUnit, heightUnit])
}

const LB_PER_KG = 1 / 0.45359237

/** kg in the unit, unrounded (a chart's points, a total). */
export const inUnit = (kg: number, unit: WeightUnit) => (unit === 'lb' ? kg * LB_PER_KG : kg)

/** A weight lifted as text, "60 kg" or "135 lb": the pounds that store back to the same kg. */
export const liftText = (kg: number, unit: WeightUnit) => `${shownWeight(kg, unit)} ${unit}`

/** A body weight in the unit, to a tenth. */
export const bodyWeight = (kg: number, unit: WeightUnit) => Math.round(inUnit(kg, unit) * 10) / 10

/** A body weight as text: "80.2 kg", "176.8 lb". */
export const bodyText = (kg: number, unit: WeightUnit) => `${bodyWeight(kg, unit)} ${unit}`

/** A body weight typed in the unit, as the kg to store. */
export const bodyKg = (value: number, unit: WeightUnit) => toKg(value, unit)

/** How a body weight moves in a week, the same way up or down: "+0.4 kg a week", "−0.9 lb a week". */
export function weeklyChange(kgPerWeek: number, unit: WeightUnit): string {
  const n = inUnit(kgPerWeek, unit)
  return `${n > 0 ? '+' : '−'}${Math.abs(n).toFixed(1)} ${unit} a week`
}

const CM_PER_INCH = 2.54

/** A height in cm as feet and whole inches. */
export function feetInches(cm: number): { ft: number; in: number } {
  const inches = Math.round(cm / CM_PER_INCH)
  return { ft: Math.floor(inches / 12), in: inches % 12 }
}

/** Feet and inches as the whole cm stored. */
export const cmFrom = (ft: number, inches: number) => Math.round((ft * 12 + inches) * CM_PER_INCH)

/** A height as text: "178 cm", "5 ft 10 in". */
export function heightText(cm: number, unit: HeightUnit): string {
  if (unit === 'cm') return `${Math.round(cm)} cm`
  const { ft, in: inches } = feetInches(cm)
  return `${ft} ft ${inches} in`
}
