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
  | 'cardioSessions' | 'goalWeeks' | 'foods' | 'savedMeals' | 'quests'

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
  cardioSessions: 'sessions', goalWeeks: 'weeks', foods: 'foods', savedMeals: 'meals', quests: 'quests',
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
    ['workouts_5', '🔁', 'Warming Up', 'Complete 5 workouts', 'workouts', 5],
    ['workouts_25', '📅', 'Regular', 'Complete 25 workouts', 'workouts', 25],
    ['workouts_500', '🏟️', 'Iron Resident', 'Complete 500 workouts', 'workouts', 500],
    ['workouts_1000', '🌋', 'Thousand Sessions', 'Complete 1,000 workouts', 'workouts', 1000],
    ['sets_500', '📦', 'Stacking Up', 'Log 500 total sets', 'sets', 500],
    ['sets_2500', '🏗️', 'Builder', 'Log 2,500 total sets', 'sets', 2500],
    ['sets_10000', '🏭', 'Factory Floor', 'Log 10,000 total sets', 'sets', 10000],
    ['volume_10t', '🛻', 'First Ten Tonnes', 'Lift 10 tonnes in total', 'volumeT', 10],
    ['volume_50t', '🚛', 'Truckload', 'Lift 50 tonnes in total', 'volumeT', 50],
    ['volume_2500t', '🏔️', 'Range Shifter', 'Lift 2,500 tonnes in total', 'volumeT', 2500],
    ['exercises_10', '🔀', 'Variety', 'Log 10 different exercises', 'exercises', 10],
    ['exercises_50', '🗂️', 'Well Rounded', 'Log 50 different exercises', 'exercises', 50],
    ['routines_5', '🗃️', 'Programmer', 'Save 5 routines', 'routines', 5],
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
    ['ranked_5', '🏷️', 'Five Ranked', 'Earn a rank on 5 lifts', 'rankedLifts', 5],
    ['ranked_10', '🎗️', 'Ten Ranked', 'Earn a rank on 10 lifts', 'rankedLifts', 10],
    ['ranked_20', '🏵️', 'Twenty Ranked', 'Earn a rank on 20 lifts', 'rankedLifts', 20],
    ['lift_silver', '🥈', 'Silver Lining', 'Reach Silver rank on any lift', 'liftRating', tier('silver')],
    ['lift_titan', '🗡️', 'Titan Grip', 'Reach Titan rank on any lift', 'liftRating', tier('titan')],
    ['lift_olympian', '🏺', 'Olympian', 'Reach Olympian rank on any lift', 'liftRating', tier('olympian')],
    ['groups_3', '🧩', 'Taking Shape', 'Rank three muscle groups', 'groupsRanked', 3],
    ['overall_silver', '🔰', 'Solid Base', 'Reach an overall rank of Silver', 'overallRating', tier('silver')],
    ['overall_champion', '🏰', 'Champion Build', 'Reach an overall rank of Champion', 'overallRating', tier('champion')],
  ]),
  ...group('cardio', [
    ['run_5k', '🏃', 'First 5K', 'Run 5 km in one go', 'longestRunKm', 5],
    ['run_10k', '🛣️', 'Double Digits', 'Run 10 km in one go', 'longestRunKm', 10],
    ['run_half', '🏅', 'Half Marathon', 'Run 21.1 km in one go', 'longestRunKm', 21.1],
    ['cardio_100km', '🗺️', 'Going Places', 'Cover 100 km of cardio in total', 'cardioKm', 100],
    ['cardio_500km', '🚀', 'Long Haul', 'Cover 500 km of cardio in total', 'cardioKm', 500],
    ['running_gold', '⏱️', 'Quick Feet', 'Reach Gold running rank', 'runningRating', tier('gold')],
    ['run_15k', '🌄', 'Fifteen K', 'Run 15 km in one go', 'longestRunKm', 15],
    ['run_marathon', '🎽', 'Marathoner', 'Run 42.2 km in one go', 'longestRunKm', 42.2],
    ['cardio_25km', '🚲', 'On the Move', 'Cover 25 km of cardio in total', 'cardioKm', 25],
    ['cardio_1000km', '🌍', 'Globetrotter', 'Cover 1,000 km of cardio in total', 'cardioKm', 1000],
    ['cardio_sessions_10', '💨', 'Cardio Habit', 'Log 10 cardio sessions', 'cardioSessions', 10],
    ['cardio_sessions_50', '🫀', 'Big Engine', 'Log 50 cardio sessions', 'cardioSessions', 50],
    ['running_platinum', '⏲️', 'Fleet-Footed', 'Reach Platinum running rank', 'runningRating', tier('platinum')],
  ]),
  ...group('consistency', [
    ['week_streak', '🔥', 'On Fire', 'Reach a 7-day streak', 'longestStreak', 7],
    ['month_streak', '⚡', 'Unstoppable', 'Reach a 30-day streak', 'longestStreak', 30],
    ['streak_100', '💫', 'Hundred Days', 'Reach a 100-day streak', 'longestStreak', 100],
    ['level_5', '⭐', 'Level 5', 'Reach level 5', 'level', 5],
    ['level_10', '🌟', 'Level 10', 'Reach level 10', 'level', 10],
    ['level_20', '🌠', 'Level 20', 'Reach level 20', 'level', 20],
    ['streak_3', '🕯️', 'Three in a Row', 'Reach a 3-day streak', 'longestStreak', 3],
    ['streak_14', '🔆', 'Fortnight', 'Reach a 14-day streak', 'longestStreak', 14],
    ['streak_60', '☄️', 'Two Months Strong', 'Reach a 60-day streak', 'longestStreak', 60],
    ['streak_365', '🌞', 'A Year Lit', 'Reach a 365-day streak', 'longestStreak', 365],
    ['level_2', '✨', 'Level 2', 'Reach level 2', 'level', 2],
    ['level_15', '🎇', 'Level 15', 'Reach level 15', 'level', 15],
    ['level_30', '🎆', 'Level 30', 'Reach level 30', 'level', 30],
    ['level_50', '🌌', 'Level 50', 'Reach level 50', 'level', 50],
    ['goal_weeks_4', '📆', 'Four Good Weeks', 'Hit your weekly workout goal in 4 weeks', 'goalWeeks', 4],
    ['goal_weeks_12', '🧮', 'A Season of Goals', 'Hit your weekly workout goal in 12 weeks', 'goalWeeks', 12],
    ['goal_weeks_52', '🏁', 'Year of Goals', 'Hit your weekly workout goal in 52 weeks', 'goalWeeks', 52],
  ]),
  ...group('nutrition', [
    ['first_calorie_log', '🥗', 'First Bite', 'Log your first food', 'foodDays', 1],
    ['food_7_days', '🗓️', 'Food Journal', 'Log food on 7 days', 'foodDays', 7],
    ['food_30_days', '📔', 'On the Books', 'Log food on 30 days', 'foodDays', 30],
    ['food_100_days', '📚', 'Open Book', 'Log food on 100 days', 'foodDays', 100],
    ['protein_goal', '🥩', 'Protein King', 'Hit your protein target 7 days running', 'proteinRun', 7],
    ['protein_30_days', '🍗', 'Protein Pro', 'Hit your protein target on 30 days', 'proteinDays', 30],
    ['food_3_days', '🍽️', 'Three Square', 'Log food on 3 days', 'foodDays', 3],
    ['food_365_days', '🧾', 'Year in Food', 'Log food on 365 days', 'foodDays', 365],
    ['protein_14', '🥚', 'Protein Fortnight', 'Hit your protein target 14 days running', 'proteinRun', 14],
    ['protein_100_days', '🍖', 'Protein Century', 'Hit your protein target on 100 days', 'proteinDays', 100],
    ['foods_50', '🥙', 'Varied Plate', 'Log 50 different foods', 'foods', 50],
    ['saved_meal', '🍱', 'Meal Prepper', 'Save a meal to log again', 'savedMeals', 1],
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
    ['weigh_100', '📊', 'Data Driven', 'Log your body weight 100 times', 'weighIns', 100],
    ['steps_goal_365', '🧗', 'Year of Steps', 'Reach your step goal on 365 days', 'stepGoalDays', 365],
    ['water_100', '🐳', 'Deep Water', 'Reach your water goal on 100 days', 'waterDays', 100],
    ['creatine_100', '🧪', 'Saturated', 'Tick creatine on 100 days', 'creatineDays', 100],
    ['quest_1', '📜', 'First Quest', 'Clear a daily quest', 'quests', 1],
    ['quest_30', '🏹', 'Quest Hunter', 'Clear 30 daily quests', 'quests', 30],
  ]),
]

export const achievementDef = (key: string) => ACHIEVEMENT_DEFS.find(d => d.key === key)

/** XP for an achievement by how far up its ladder it is (the 1st of a metric, the 2nd…), so the long ones pay most. */
const XP_STEPS = [25, 50, 100, 150, 250, 400, 600]
const xpByKey = new Map<string, number>()
for (const metric of new Set(ACHIEVEMENT_DEFS.map(d => d.metric))) {
  ACHIEVEMENT_DEFS.filter(d => d.metric === metric)
    .sort((a, b) => a.target - b.target)
    .forEach((d, i) => xpByKey.set(d.key, XP_STEPS[Math.min(i, XP_STEPS.length - 1)]))
}
export const achievementXp = (def: AchievementDef) => xpByKey.get(def.key) ?? XP_STEPS[0]

/** "12 / 50 workouts": how far a count is towards an achievement, never shown past its target. */
export function progressLabel(def: AchievementDef, value: number): string {
  const shown = Math.min(value, def.target)
  const tidy = (n: number) => (Number.isInteger(n) ? n : Math.floor(n * 10) / 10).toLocaleString()
  return `${tidy(shown)} / ${tidy(def.target)} ${METRIC_UNIT[def.metric]}`.trim()
}
