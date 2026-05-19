export type AchievementDef = {
  key: string
  title: string
  description: string
  icon: string
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { key: 'first_workout',     icon: '🏋️', title: 'First Rep',       description: 'Log your first workout' },
  { key: 'ten_workouts',      icon: '🎯', title: 'Getting Serious', description: 'Complete 10 workouts' },
  { key: 'fifty_workouts',    icon: '🏆', title: 'Veteran',         description: 'Complete 50 workouts' },
  { key: 'hundred_sets',      icon: '💯', title: 'Century',         description: 'Log 100 total sets' },
  { key: 'first_pr',          icon: '💪', title: 'New Record',      description: 'Set your first personal record' },
  { key: 'week_streak',       icon: '🔥', title: 'On Fire',         description: 'Reach a 7-day streak' },
  { key: 'month_streak',      icon: '⚡', title: 'Unstoppable',     description: 'Reach a 30-day streak' },
  { key: 'level_5',           icon: '⭐', title: 'Level 5',         description: 'Reach level 5' },
  { key: 'level_10',          icon: '🌟', title: 'Level 10',        description: 'Reach level 10' },
  { key: 'first_calorie_log', icon: '🥗', title: 'Eating Clean',    description: 'Log a full day of food' },
  { key: 'protein_goal',      icon: '🥩', title: 'Protein King',    description: 'Hit your protein target 7 days running' },
  { key: 'weight_logged',     icon: '⚖️', title: 'Weigh-In',       description: 'Log your body weight for the first time' },
]
