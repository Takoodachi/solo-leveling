export type AchievementDef = {
  key: string
  title: string
  description: string
  icon: string
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { key: 'week_streak',       icon: '🔥', title: 'On Fire',         description: 'Reach a 7-day streak' },
  { key: 'month_streak',      icon: '⚡', title: 'Unstoppable',     description: 'Reach a 30-day streak' },
  { key: 'level_5',           icon: '⭐', title: 'Level 5',         description: 'Reach level 5' },
  { key: 'level_10',          icon: '🌟', title: 'Level 10',        description: 'Reach level 10' },
  { key: 'first_calorie_log', icon: '🥗', title: 'Eating Clean',    description: 'Log a full day of food' },
  { key: 'protein_goal',      icon: '🥩', title: 'Protein King',    description: 'Hit your protein target 7 days running' },
  { key: 'weight_logged',     icon: '⚖️', title: 'Weigh-In',       description: 'Log your body weight for the first time' },
]
