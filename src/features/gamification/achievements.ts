import { TIERS, type TierKey } from '@/features/ranks/tiers'

/**
 * Achievements are declarative: each counts one number (`metric`, read by achievementStats.ts)
 * and unlocks when it reaches `target`. That same pair is its progress bar, so a locked one can
 * be picked as a goal. Keys are permanent (they're the ids of unlocked rows); titles can change.
 * They reward showing up and getting stronger, never eating less or weighing less.
 */

export type AchievementMetric =
  | 'workouts' | 'sets' | 'volumeT' | 'exercises' | 'routines'
  | 'rankedLifts' | 'liftRating' | 'overallRating' | 'groupsRanked' | 'runningRating'
  | 'longestRunKm' | 'cardioKm'
  | 'longestStreak' | 'level'
  | 'foodDays' | 'proteinRun' | 'proteinDays'
  | 'weighIns' | 'stepGoalDays' | 'waterDays' | 'creatineDays'

export type AchievementCategory = 'training' | 'strength' | 'cardio' | 'consistency' | 'nutrition' | 'habits'

export const ACHIEVEMENT_CATEGORIES: { key: AchievementCategory; label: string }[] = [
  { key: 'training', label: 'Training' },
  { key: 'strength', label: 'Strength' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'habits', label: 'Daily habits' },
]

export type AchievementDef = {
  key: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  metric: AchievementMetric
  target: number
}

/** What a metric is counted in, after "12 / 50". */
export const METRIC_UNIT: Record<AchievementMetric, string> = {
  workouts: 'workouts', sets: 'sets', volumeT: 'tonnes', exercises: 'exercises', routines: 'routines',
  rankedLifts: 'lifts', liftRating: 'rating', overallRating: 'rating', groupsRanked: 'groups', runningRating: 'rating',
  longestRunKm: 'km', cardioKm: 'km',
  longestStreak: 'days', level: '',
  foodDays: 'days', proteinRun: 'days', proteinDays: 'days',
  weighIns: 'weigh-ins', stepGoalDays: 'days', waterDays: 'days', creatineDays: 'days',
}

const tier = (key: TierKey) => TIERS.find(t => t.key === key)?.min ?? Infinity

type Row = [key: string, icon: string, title: string, description: string, metric: AchievementMetric, target: number]
const group = (category: AchievementCategory, rows: Row[]): AchievementDef[] =>
  rows.map(([key, icon, title, description, metric, target]) => ({ key, icon, title, description, category, metric, target }))

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  ...group('training', [
    ['first_workout', '🏋️', 'First Rep', 'Log your first workout', 'workouts', 1],
    ['ten_workouts', '🎯', 'Getting Serious', 'Complete 10 workouts', 'workouts', 10],
    ['fifty_workouts', '🏆', 'Veteran', 'Complete 50 workouts', 'workouts', 50],
    ['hundred_workouts', '🏛️', 'Centurion', 'Complete 100 workouts', 'workouts', 100],
    ['workouts_250', '🗿', 'Part of the Furniture', 'Complete 250 workouts', 'workouts', 250],
    ['hundred_sets', '💯', 'Century', 'Log 100 total sets', 'sets', 100],
    ['thousand_sets', '🧱', 'Brick by Brick', 'Log 1,000 total sets', 'sets', 1000],
    ['sets_5000', '⚙️', 'Machine', 'Log 5,000 total sets', 'sets', 5000],
    ['volume_100t', '🚚', 'Heavy Hauler', 'Lift 100 tonnes in total', 'volumeT', 100],
    ['volume_500t', '🚂', 'Freight Train', 'Lift 500 tonnes in total', 'volumeT', 500],
    ['volume_1000t', '⛰️', 'Mountain Mover', 'Lift 1,000 tonnes in total', 'volumeT', 1000],
    ['exercises_25', '🧭', 'Explorer', 'Log 25 different exercises', 'exercises', 25],
    ['first_routine', '📋', 'Planner', 'Save your first routine', 'routines', 1],
  ]),
  ...group('strength', [
    ['first_rank', '🎖️', 'Ranked', 'Earn your first lift rank', 'rankedLifts', 1],
    ['lift_gold', '🥇', 'Gold Standard', 'Reach Gold rank on any lift', 'liftRating', tier('gold')],
    ['lift_platinum', '💠', 'Platinum Club', 'Reach Platinum rank on any lift', 'liftRating', tier('platinum')],
    ['lift_diamond', '💎', 'Diamond Lifter', 'Reach Diamond rank on any lift', 'liftRating', tier('diamond')],
    ['lift_champion', '👑', 'Champion', 'Reach Champion rank on any lift', 'liftRating', tier('champion')],
    ['groups_all', '🧍', 'Head to Toe', 'Rank all six muscle groups', 'groupsRanked', 6],
    ['overall_gold', '🛡️', 'All-Rounder', 'Reach an overall rank of Gold', 'overallRating', tier('gold')],
    ['overall_platinum', '⚔️', 'Well Forged', 'Reach an overall rank of Platinum', 'overallRating', tier('platinum')],
    ['overall_diamond', '🔷', 'Cut Above', 'Reach an overall rank of Diamond', 'overallRating', tier('diamond')],
  ]),
  ...group('cardio', [
    ['run_5k', '🏃', 'First 5K', 'Run 5 km in one go', 'longestRunKm', 5],
    ['run_10k', '🛣️', 'Double Digits', 'Run 10 km in one go', 'longestRunKm', 10],
    ['run_half', '🏅', 'Half Marathon', 'Run 21.1 km in one go', 'longestRunKm', 21.1],
    ['cardio_100km', '🗺️', 'Going Places', 'Cover 100 km of cardio in total', 'cardioKm', 100],
    ['cardio_500km', '🚀', 'Long Haul', 'Cover 500 km of cardio in total', 'cardioKm', 500],
    ['running_gold', '⏱️', 'Quick Feet', 'Reach Gold running rank', 'runningRating', tier('gold')],
  ]),
  ...group('consistency', [
    ['week_streak', '🔥', 'On Fire', 'Reach a 7-day streak', 'longestStreak', 7],
    ['month_streak', '⚡', 'Unstoppable', 'Reach a 30-day streak', 'longestStreak', 30],
    ['streak_100', '💫', 'Hundred Days', 'Reach a 100-day streak', 'longestStreak', 100],
    ['level_5', '⭐', 'Level 5', 'Reach level 5', 'level', 5],
    ['level_10', '🌟', 'Level 10', 'Reach level 10', 'level', 10],
    ['level_20', '🌠', 'Level 20', 'Reach level 20', 'level', 20],
  ]),
  ...group('nutrition', [
    ['first_calorie_log', '🥗', 'First Bite', 'Log your first food', 'foodDays', 1],
    ['food_7_days', '🗓️', 'Food Journal', 'Log food on 7 days', 'foodDays', 7],
    ['food_30_days', '📔', 'On the Books', 'Log food on 30 days', 'foodDays', 30],
    ['food_100_days', '📚', 'Open Book', 'Log food on 100 days', 'foodDays', 100],
    ['protein_goal', '🥩', 'Protein King', 'Hit your protein target 7 days running', 'proteinRun', 7],
    ['protein_30_days', '🍗', 'Protein Pro', 'Hit your protein target on 30 days', 'proteinDays', 30],
  ]),
  ...group('habits', [
    ['weight_logged', '⚖️', 'Weigh-In', 'Log your body weight for the first time', 'weighIns', 1],
    ['weigh_30', '📈', 'On the Record', 'Log your body weight 30 times', 'weighIns', 30],
    ['steps_goal_1', '👟', 'Step It Up', 'Reach your step goal for a day', 'stepGoalDays', 1],
    ['steps_goal_30', '🚶', 'Daily Walker', 'Reach your step goal on 30 days', 'stepGoalDays', 30],
    ['steps_goal_100', '🥾', 'Trailblazer', 'Reach your step goal on 100 days', 'stepGoalDays', 100],
    ['water_7', '💧', 'Hydrated', 'Reach your water goal on 7 days', 'waterDays', 7],
    ['water_30', '🌊', 'High Tide', 'Reach your water goal on 30 days', 'waterDays', 30],
    ['creatine_30', '💊', 'Daily Dose', 'Tick creatine on 30 days', 'creatineDays', 30],
  ]),
]

export const achievementDef = (key: string) => ACHIEVEMENT_DEFS.find(d => d.key === key)

/** "12 / 50 workouts": how far a count is towards an achievement, never shown past its target. */
export function progressLabel(def: AchievementDef, value: number): string {
  const shown = Math.min(value, def.target)
  const tidy = (n: number) => (Number.isInteger(n) ? n : Math.floor(n * 10) / 10).toLocaleString()
  return `${tidy(shown)} / ${tidy(def.target)} ${METRIC_UNIT[def.metric]}`.trim()
}
