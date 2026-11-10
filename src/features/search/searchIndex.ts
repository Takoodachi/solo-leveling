import {
  Award, Bell, ClipboardList, BicepsFlexed, CalendarCheck, CalendarDays, ChartColumn, ChartLine, ChartPie, Cloud, Dumbbell, Eye,
  Footprints, GlassWater, Goal, History, House, LayoutGrid, Lightbulb, ListPlus, Medal, Music2, PanelBottom, Palette, PersonStanding,
  Play, Radar, Ruler, Scale, Settings, Smartphone, Target, Timer, ToggleRight, TrendingUp, Trophy, UserRound, UtensilsCrossed, Zap,
  type LucideIcon,
} from 'lucide-react'
import { ACHIEVEMENT_DEFS } from '@/features/gamification/achievements'
import { THEMES } from '@/features/settings/themes'
import { EXTRAS } from '@/features/settings/extras'
import { isAndroidApp } from '@/lib/native'
import type { Exercise } from '@/types'

/** Things a result can do besides opening a page (they open sheets on Home). */
export type SearchAction = 'log-steps' | 'log-water' | 'customize-home'

export type SearchGroup = 'actions' | 'pages' | 'routines' | 'exercises' | 'foods' | 'workouts' | 'friends'

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
  /** A setting that's only there with an account on the leaderboard, or with sync set up. */
  only?: 'signedIn' | 'account'
}

type Entry = Omit<SearchItem, 'group'>

/**
 * Every setting: the Settings page's sections and what's inside them, and the settings that live
 * on Profile and the plan. Settings' own search looks through these alone (settingsSearch.ts), by
 * name or by a description of the change, so their keywords carry the everyday words someone
 * would use ("darker", "buzzing", "popup"); Home's search finds them among everything else.
 */
export const SETTING_ENTRIES: Entry[] = [
  { id: 'account', title: 'Account & sync', subtitle: 'Settings', keywords: 'sign in sign out log in login logout email password cloud sync devices', Icon: Cloud, to: '/settings#account', only: 'account' },
  { id: 'sharing', title: 'Leaderboard sharing', subtitle: 'Settings › Leaderboard', keywords: 'privacy private share sharing visible hide friends public', Icon: Eye, to: '/settings#sharing', only: 'signedIn' },
  { id: 'share-routines', title: 'Show my routines', subtitle: 'Settings › Leaderboard', keywords: 'routines plan share friends copy privacy private visible', Icon: Eye, to: '/settings#sharing', only: 'signedIn' },
  ...(isAndroidApp() ? [{ id: 'health-steps', title: 'Samsung Health steps', subtitle: 'Settings › Steps', keywords: 'steps health connect samsung watch sync background import walking heart rate', Icon: Footprints, to: '/settings#steps' }] : []),
  { id: 'reminders', title: 'Reminders', subtitle: 'Settings', keywords: 'notifications notify push alert alarm remind nudge workout creatine food weigh weight water recap time', Icon: Bell, to: '/settings#reminders' },
  { id: 'workout-tips', title: 'Tips during workouts', subtitle: 'Settings › Workouts', keywords: 'suggestions hints progression weight reps increase recommend advice', Icon: Lightbulb, to: '/settings#workouts' },
  { id: 'music-app', title: 'Music app', subtitle: 'Settings › Workouts', keywords: 'music song songs playlist spotify youtube apple amazon soundcloud player skip pause', Icon: Music2, to: '/settings#workouts' },
  { id: 'workout-screen', title: 'Workout screen layout', subtitle: 'Settings › Workouts', keywords: 'rest timer music controls position top bottom move place logger', Icon: Dumbbell, to: '/settings#workouts' },
  { id: 'theme', title: 'Theme', subtitle: 'Settings › Theme', keywords: `dark light mode colour colours color colors palette appearance look accent bright night custom own ${THEMES.map(t => t.name).join(' ')}`, Icon: Palette, to: '/settings#theme' },
  { id: 'card-style', title: 'Card style', subtitle: 'Settings › Theme', keywords: 'cards boxes glass outline glow raised aura solid border transparent look', Icon: Palette, to: '/settings#theme' },
  { id: 'background-photo', title: 'Background photo', subtitle: 'Settings › Theme', keywords: 'wallpaper background picture image photo behind', Icon: Palette, to: '/settings#theme' },
  { id: 'bottom-bar', title: 'Bottom bar', subtitle: 'Settings', keywords: 'navigation nav bar tabs menu buttons', Icon: PanelBottom, to: '/settings#bottom-bar' },
  { id: 'home-screen', title: 'Home screen layout', subtitle: 'Settings › Home screen', keywords: 'widgets cards customize home order arrange daily quest steps calories water creatine macros streak', Icon: LayoutGrid, to: '/settings#home-screen' },
  { id: 'home-search', title: 'Search bar on Home', subtitle: 'Settings › Home screen', keywords: 'search bar home find', Icon: LayoutGrid, to: '/settings#home-screen' },
  ...EXTRAS.filter(x => x.only !== 'android' || isAndroidApp()).map((x): Entry => ({
    id: `extra-${x.key}`, title: x.label, subtitle: 'Settings › Extras', keywords: `${x.keywords} ${x.description}`, Icon: ToggleRight,
    to: `/settings#extras--${x.key}`, only: x.only === 'signedIn' ? 'signedIn' : undefined,
  })),
  { id: 'setup', title: 'Setup questions', subtitle: 'Settings', keywords: 'survey onboarding personalize personalise redo welcome start again questions plan targets track', Icon: ClipboardList, to: '/setup' },
  ...(isAndroidApp() ? [{ id: 'app-icon', title: 'App icon shortcuts', subtitle: 'Settings › App icon', keywords: 'long press hold home screen launcher quick actions icon shortcut', Icon: Smartphone, to: '/settings#app-icon' }] : []),
  { id: 'name-photo', title: 'Name and photo', subtitle: 'Profile', keywords: 'name photo picture avatar profile display', Icon: UserRound, to: '/profile' },
  { id: 'body-goals', title: 'Body & goals', subtitle: 'Profile', keywords: 'height sex age activity goal bodyweight weight cut bulk maintain lose gain pace training since', Icon: Ruler, to: '/profile#body-goals' },
  { id: 'targets', title: 'Daily targets', subtitle: 'Profile', keywords: 'calories calorie kcal protein carbs fat macros goal budget limit target food eat', Icon: Goal, to: '/profile#targets' },
  { id: 'step-calories', title: 'Step calories', subtitle: 'Profile › Daily targets', keywords: 'steps walking burn burned calories subtract net', Icon: Goal, to: '/profile#targets' },
  { id: 'training-carbs', title: 'More carbs on workout days', subtitle: 'Profile › Daily targets', keywords: 'carbs carbohydrates workout training days fat rest cycling', Icon: Goal, to: '/profile#targets' },
  { id: 'plan', title: 'Weekly plan', subtitle: 'Workouts › Plan', keywords: 'schedule split days program routine', Icon: CalendarDays, to: '/workouts/plan#schedule' },
  { id: 'frequency', title: 'Training frequency goal', subtitle: 'Workouts › Plan', keywords: 'workouts per week weekly goal times', Icon: Target, to: '/workouts/plan#frequency' },
  { id: 'rest', title: 'Rest timer', subtitle: 'Workouts › Plan', keywords: 'rest seconds between sets timer length long short', Icon: Timer, to: '/workouts/plan#rest-timer' },
]

/** Screens and the sections inside them (#ids are anchors on those pages). */
export const PAGE_ENTRIES: Entry[] = [
  { id: 'home', title: 'Home', subtitle: 'Today’s plan and weekly stats', keywords: 'dashboard today week strip', Icon: House, to: '/home' },
  { id: 'recap', title: 'Weekly recap', subtitle: 'Last week in review', keywords: 'summary review report week wrapped share image', Icon: CalendarCheck, to: '/recap' },
  { id: 'recap-month', title: 'Monthly recap', subtitle: 'Last month in review', keywords: 'summary review report month wrapped share image', Icon: CalendarCheck, to: '/recap?period=month' },
  { id: 'recap-year', title: 'Yearly recap', subtitle: 'Your year in review', keywords: 'summary review report year annual wrapped share image', Icon: CalendarCheck, to: '/recap?period=year' },
  { id: 'workouts', title: 'Workouts', subtitle: 'Routines, templates and history', keywords: 'training gym lift routines templates', Icon: Dumbbell, to: '/workouts' },
  { id: 'history', title: 'Workout history', subtitle: 'Workouts', keywords: 'past sessions log', Icon: History, to: '/workouts/history' },
  { id: 'nutrition', title: 'Nutrition', subtitle: 'Food log, meals and calories', keywords: 'food eat diet meals calories kcal macros', Icon: UtensilsCrossed, to: '/nutrition' },
  { id: 'food-history', title: 'Food history', subtitle: 'Nutrition', keywords: 'past days meals ate eaten log calendar', Icon: History, to: '/nutrition/history' },
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
  { id: 'leaderboard', title: 'Leaderboard', subtitle: 'Friends, podium and crowns', keywords: 'friends compete ranking podium crowns highlights high five high-five', Icon: Trophy, to: '/leaderboard' },
  { id: 'profile', title: 'Profile', subtitle: 'Name, photo, level and XP', keywords: 'me avatar photo name level xp', Icon: UserRound, to: '/profile' },
  { id: 'achievements', title: 'Achievements', subtitle: 'Profile', keywords: `badges unlocked ${ACHIEVEMENT_DEFS.map(a => a.title).join(' ')}`, Icon: Award, to: '/profile#achievements' },
  { id: 'settings', title: 'Settings', subtitle: 'Account, theme and more', keywords: 'preferences options', Icon: Settings, to: '/settings' },
  ...SETTING_ENTRIES,
]

/** Shown before typing: the main screens. */
export const JUMP_TO = ['workouts', 'nutrition', 'analytics', 'ranks', 'leaderboard', 'profile', 'settings']

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
