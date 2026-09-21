import { Dumbbell, Footprints, Weight, Utensils, Beef, type LucideIcon } from 'lucide-react'
import type { ChallengeMetric } from '@/types'

export const CHALLENGE_METRICS: Record<ChallengeMetric, {
  label: string
  unit: string
  Icon: LucideIcon
  defaultTarget: number
  title: (target: number) => string
}> = {
  workouts:       { label: 'Workouts',         unit: 'workouts', Icon: Dumbbell,   defaultTarget: 12,     title: n => `Complete ${n} workouts` },
  steps:          { label: 'Steps',            unit: 'steps',    Icon: Footprints, defaultTarget: 200000, title: n => `Walk ${n.toLocaleString()} steps` },
  volume:         { label: 'Training volume',  unit: 'kg',       Icon: Weight,     defaultTarget: 50000,  title: n => `Lift ${n.toLocaleString()} kg` },
  'food-days':    { label: 'Days food logged', unit: 'days',     Icon: Utensils,   defaultTarget: 14,     title: n => `Log food ${n} days` },
  'protein-days': { label: 'Protein target',   unit: 'days',     Icon: Beef,       defaultTarget: 10,     title: n => `Hit protein ${n} days` },
}

export const METRIC_KEYS = Object.keys(CHALLENGE_METRICS) as ChallengeMetric[]
