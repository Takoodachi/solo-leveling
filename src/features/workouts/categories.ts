import { Dumbbell, Zap, HeartPulse, Target, Waves, SignalLow, SignalMedium, SignalHigh, type LucideIcon } from 'lucide-react'
import type { RoutineCategory, RoutineLevel } from '@/types'

export const CATEGORY_META: Record<RoutineCategory, { label: string; Icon: LucideIcon; hue: number }> = {
  strength:    { label: 'Strength',  Icon: Dumbbell,   hue: 18 },
  'full-body': { label: 'Full body', Icon: Zap,        hue: 28 },
  cardio:      { label: 'Cardio',    Icon: HeartPulse, hue: 355 },
  core:        { label: 'Core',      Icon: Target,     hue: 38 },
  mobility:    { label: 'Mobility',  Icon: Waves,      hue: 200 },
}

export const CATEGORIES = Object.keys(CATEGORY_META) as RoutineCategory[]

export const LEVEL_META: Record<RoutineLevel, { label: string; Icon: LucideIcon }> = {
  beginner:     { label: 'Beginner',     Icon: SignalLow },
  intermediate: { label: 'Intermediate', Icon: SignalMedium },
  advanced:     { label: 'Advanced',     Icon: SignalHigh },
}

export const LEVELS = Object.keys(LEVEL_META) as RoutineLevel[]

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
/** Monday-first display order (0 = Sunday). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const
