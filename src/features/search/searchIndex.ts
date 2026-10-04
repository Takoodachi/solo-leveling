import {
  Award, Bell, BicepsFlexed, CalendarCheck, CalendarDays, ChartColumn, ChartLine, ChartPie, Cloud, DatabaseBackup, Dumbbell, Eye, Flag,
  Footprints, GlassWater, Goal, History, House, LayoutGrid, ListPlus, Medal, PanelBottom, Palette, PersonStanding,
  Play, Radar, Ruler, Scale, Settings, Target, Timer, TrendingUp, Trophy, UserRound, UtensilsCrossed, Zap,
  type LucideIcon,
} from 'lucide-react'
import { ACHIEVEMENT_DEFS } from '@/features/gamification/achievements'
import { THEMES } from '@/features/settings/themes'
import type { Exercise } from '@/types'

/** Things a result can do besides opening a page (they open sheets on Home). */
export type SearchAction = 'log-steps' | 'log-water' | 'customize-home'

export type SearchGroup = 'actions' | 'pages' | 'routines' | 'exercises' | 'foods' | 'workouts' | 'challenges' | 'friends'

export interface SearchItem {
  id: string
  group: SearchGroup
  title: string
  subtitle?: string
  /** Extra words that should find this item. */
  keywords?: string
  Icon: LucideIcon
  to?: string
  action?: SearchAction
  /** Show this exercise's info sheet. */
  exercise?: Exercise
}

type Entry = Omit<SearchItem, 'group'>

/** Screens and the sections inside them (#ids are anchors on those pages). */
export const PAGE_ENTRIES: Entry[] = [
  { id: 'home', title: 'Home', subtitle: 'Today’s plan and weekly stats', keywords: 'dashboard today week strip', Icon: House, to: '/home' },
  { id: 'recap', title: 'Weekly recap', subtitle: 'Last week in review', keywords: 'summary review report week wrapped', Icon: CalendarCheck, to: '/recap' },
  { id: 'workouts', title: 'Workouts', subtitle: 'Routines, templates and history', keywords: 'training gym lift routines templates', Icon: Dumbbell, to: '/workouts' },
  { id: 'history', title: 'Workout history', subtitle: 'Workouts', keywords: 'past sessions log', Icon: History, to: '/workouts/history' },
  { id: 'plan', title: 'Weekly plan', subtitle: 'Workouts', keywords: 'schedule split days program', Icon: CalendarDays, to: '/workouts/plan#schedule' },
  { id: 'frequency', title: 'Training frequency goal', subtitle: 'Workouts › Plan', keywords: 'workouts per week weekly goal', Icon: Target, to: '/workouts/plan#frequency' },
  { id: 'rest', title: 'Rest timer', subtitle: 'Workouts › Plan', keywords: 'rest seconds between sets', Icon: Timer, to: '/workouts/plan#rest-timer' },
  { id: 'nutrition', title: 'Nutrition', subtitle: 'Food log, meals and calories', keywords: 'food eat diet meals calories kcal macros', Icon: UtensilsCrossed, to: '/nutrition' },
  { id: 'analytics', title: 'Analytics', subtitle: 'Charts and progress', keywords: 'stats graphs charts progress', Icon: ChartColumn, to: '/analytics' },
  { id: 'set-volume', title: 'Set volume radar', subtitle: 'Analytics', keywords: 'weekly analysis sets per muscle mev mav mrv volume landmarks', Icon: Radar, to: '/analytics#set-volume' },
  { id: 'training-volume', title: 'Training volume', subtitle: 'Analytics', keywords: 'tonnage weekly volume kg lifted', Icon: ChartColumn, to: '/analytics#training-volume' },
  { id: 'strength-progress', title: 'Strength progress', subtitle: 'Analytics', keywords: '1rm one rep max est progression lifts', Icon: TrendingUp, to: '/analytics#strength-progress' },
  { id: 'macro-adherence', title: 'Macro adherence', subtitle: 'Analytics', keywords: 'protein carbs fat calories target', Icon: ChartPie, to: '/analytics#macro-adherence' },
  { id: 'weight-trend', title: 'Body weight trend', subtitle: 'Analytics', keywords: 'bodyweight scale chart', Icon: Scale, to: '/analytics#body-weight' },
  { id: 'steps-chart', title: 'Steps chart', subtitle: 'Analytics', keywords: 'walking steps history', Icon: Footprints, to: '/analytics#steps' },
  { id: 'ranks', title: 'Strength ranks', subtitle: 'Your rank, muscles and lifts', keywords: 'rank tier emblem strength level', Icon: BicepsFlexed, to: '/ranks' },
  { id: 'bodygraph', title: 'Ranked bodygraph', subtitle: 'Ranks', keywords: 'muscles body map anatomy', Icon: PersonStanding, to: '/ranks#bodygraph' },
  { id: 'muscle-rankings', title: 'Muscle rankings', subtitle: 'Ranks', keywords: 'chest shoulders arms back core legs groups', Icon: Medal, to: '/ranks#muscle-rankings' },
  { id: 'running-rank', title: 'Running rank', subtitle: 'Ranks', keywords: 'run 5k pace cardio', Icon: Zap, to: '/ranks#running-rank' },
  { id: 'rank-progress', title: 'Rank progress', subtitle: 'Ranks', keywords: 'rank history rating weekly chart', Icon: ChartLine, to: '/ranks#rank-progress' },
  { id: 'ranked-lifts', title: 'Ranked lifts', subtitle: 'Ranks', keywords: 'next division target lifts', Icon: Dumbbell, to: '/ranks#lifts' },
  { id: 'how-ranks', title: 'How ranks work', subtitle: 'Ranks', keywords: 'tiers ladder wood bronze silver gold platinum diamond champion titan olympian', Icon: Medal, to: '/ranks#how-ranks-work' },
  { id: 'leaderboard', title: 'Leaderboard', subtitle: 'Friends, podium and crowns', keywords: 'friends compete ranking podium crowns highlights', Icon: Trophy, to: '/leaderboard' },
  { id: 'challenges', title: 'Challenges', subtitle: 'Personal goals with a deadline', keywords: 'goal target deadline', Icon: Flag, to: '/challenges' },
  { id: 'profile', title: 'Profile', subtitle: 'Name, photo, level and XP', keywords: 'me avatar photo name level xp', Icon: UserRound, to: '/profile' },
  { id: 'achievements', title: 'Achievements', subtitle: 'Profile', keywords: `badges unlocked ${ACHIEVEMENT_DEFS.map(a => a.title).join(' ')}`, Icon: Award, to: '/profile#achievements' },
  { id: 'body-goals', title: 'Body & goals', subtitle: 'Profile', keywords: 'height sex age activity goal bodyweight', Icon: Ruler, to: '/profile#body-goals' },
  { id: 'targets', title: 'Daily targets', subtitle: 'Profile', keywords: 'calories kcal protein carbs fat macros step calories', Icon: Goal, to: '/profile#targets' },
  { id: 'settings', title: 'Settings', subtitle: 'Account, theme and backup', keywords: 'preferences options', Icon: Settings, to: '/settings' },
  { id: 'account', title: 'Account & sync', subtitle: 'Settings', keywords: 'sign in sign out log in login logout email password cloud sync', Icon: Cloud, to: '/settings#account' },
  { id: 'sharing', title: 'Leaderboard sharing', subtitle: 'Settings', keywords: 'privacy share visible hide', Icon: Eye, to: '/settings#sharing' },
  { id: 'theme', title: 'Theme', subtitle: 'Settings', keywords: `dark light mode colours colors palette appearance ${THEMES.map(t => t.name).join(' ')}`, Icon: Palette, to: '/settings#theme' },
  { id: 'reminders', title: 'Reminders', subtitle: 'Settings', keywords: 'notifications notify push alert workout creatine food weigh water recap', Icon: Bell, to: '/settings#reminders' },
  { id: 'bottom-bar', title: 'Bottom bar', subtitle: 'Settings', keywords: 'navigation nav bar tabs', Icon: PanelBottom, to: '/settings#bottom-bar' },
  { id: 'home-screen', title: 'Home screen layout', subtitle: 'Settings', keywords: 'widgets cards customize home search bar hide show', Icon: LayoutGrid, to: '/settings#home-screen' },
  { id: 'backup', title: 'Backup', subtitle: 'Settings', keywords: 'export import json data restore', Icon: DatabaseBackup, to: '/settings#backup' },
]

/** Shown before typing: the main screens. */
export const JUMP_TO = ['workouts', 'nutrition', 'analytics', 'ranks', 'leaderboard', 'challenges', 'profile', 'settings']

export function actionEntries(draft: 'none' | 'workout' | 'editing'): Entry[] {
  const workout: Entry = draft === 'none'
    ? { id: 'start-workout', title: 'Start workout', subtitle: 'Empty session or a routine', keywords: 'begin train session gym log workout', Icon: Play, to: '/workouts?start=1' }
    : { id: 'resume-workout', title: draft === 'editing' ? 'Resume editing' : 'Resume workout', subtitle: 'Pick up where you left off', keywords: 'continue start workout session', Icon: Play, to: '/workouts/active' }
  return [
    workout,
    { id: 'log-food', title: 'Log food', subtitle: 'Add to today’s meals', keywords: 'eat meal add food calories', Icon: UtensilsCrossed, to: '/nutrition?add=1' },
    { id: 'log-weight', title: 'Log weight', subtitle: 'Body weight', keywords: 'weigh in scale bodyweight', Icon: Scale, to: '/analytics/weight' },
    { id: 'log-steps', title: 'Log steps', subtitle: 'Today’s steps', keywords: 'walking walk', Icon: Footprints, action: 'log-steps' },
    { id: 'log-water', title: 'Log water', subtitle: 'Add a glass', keywords: 'drink hydration glass', Icon: GlassWater, action: 'log-water' },
    { id: 'new-routine', title: 'New routine', subtitle: 'Build a workout routine', keywords: 'create routine program', Icon: ListPlus, to: '/workouts/routine/new' },
    { id: 'customize-home', title: 'Customize home', subtitle: 'Pick and order the cards', keywords: 'widgets layout cards', Icon: LayoutGrid, action: 'customize-home' },
  ]
}
