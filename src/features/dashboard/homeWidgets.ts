import { Dumbbell, Footprints, Flame, GlassWater, Pill, PieChart, Swords, Medal, Star, Users, type LucideIcon } from 'lucide-react'
import type { HomeWidgetId, Settings } from '@/types'

export interface HomeWidgetDef {
  id: HomeWidgetId
  label: string
  description: string
  icon: LucideIcon
  /** Half-width tile; neighbouring tiles share a row. */
  tile?: boolean
}

/** Every card the Home screen can show, in default order. */
export const HOME_WIDGETS: HomeWidgetDef[] = [
  { id: 'workout',   label: 'Today’s workout', description: 'Scheduled routine or what you trained', icon: Dumbbell },
  { id: 'steps',     label: 'Steps',           description: 'Steps vs your daily goal',              icon: Footprints, tile: true },
  { id: 'calories',  label: 'Calories',        description: 'Food logged vs your target',            icon: Flame,      tile: true },
  { id: 'water',     label: 'Water',           description: 'One-tap glass counter',                 icon: GlassWater, tile: true },
  { id: 'creatine',  label: 'Creatine',        description: 'Daily check-off',                       icon: Pill,       tile: true },
  { id: 'quest',     label: 'Daily quest',     description: 'Today’s objectives, and XP for clearing them', icon: Swords },
  { id: 'macros',    label: 'Macros',          description: 'Protein, carbs and fat',                icon: PieChart },
  { id: 'rank',      label: 'Strength rank',   description: 'Overall rank and progress',             icon: Medal },
  { id: 'leaderboard', label: 'Leaderboard',   description: 'Where you stand among friends',         icon: Users },
  { id: 'streak',    label: 'Streak & level',  description: 'Day streak and XP',                     icon: Star },
]

const BY_ID = new Map(HOME_WIDGETS.map(w => [w.id, w]))
export const DEFAULT_HOME_WIDGETS: HomeWidgetId[] = HOME_WIDGETS.map(w => w.id)

export function homeWidgetDef(id: HomeWidgetId): HomeWidgetDef | undefined {
  return BY_ID.get(id)
}

/** The user's Home cards in order (all of them until they customize). */
export function homeWidgetsFrom(settings: Settings | undefined): HomeWidgetId[] {
  if (settings?.homeWidgets) return [...new Set(settings.homeWidgets)].filter(id => BY_ID.has(id))
  // Before customization existed, the creatine card could be switched off on its own.
  return DEFAULT_HOME_WIDGETS.filter(id => id !== 'creatine' || settings?.creatineEnabled !== false)
}

/**
 * `ids` with the quest moved to just under the last tracker tile, when it sits above one. It
 * used to come first, which kept the trackers below the first screen.
 */
export function questBelowTiles(ids: HomeWidgetId[]): HomeWidgetId[] {
  const quest = ids.indexOf('quest')
  const lastTile = ids.findLastIndex(id => BY_ID.get(id)?.tile)
  if (quest < 0 || lastTile < quest) return ids
  return [...ids.slice(0, quest), ...ids.slice(quest + 1, lastTile + 1), 'quest', ...ids.slice(lastTile + 1)]
}

/** Rows for the Home grid: consecutive tiles pair up, a lone tile spans the row. */
export function homeRows(ids: HomeWidgetId[]): HomeWidgetId[][] {
  const rows: HomeWidgetId[][] = []
  let pending: HomeWidgetId | null = null
  for (const id of ids) {
    if (BY_ID.get(id)?.tile) {
      if (pending) {
        rows.push([pending, id])
        pending = null
      } else {
        pending = id
      }
      continue
    }
    if (pending) rows.push([pending])
    pending = null
    rows.push([id])
  }
  if (pending) rows.push([pending])
  return rows
}
