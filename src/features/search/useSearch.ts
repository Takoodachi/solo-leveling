import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { Dumbbell, Flag, History, ListChecks, UserRound, UtensilsCrossed } from 'lucide-react'
import { db } from '@/db'
import { ROUTINE_TEMPLATES } from '@/data/routineTemplates'
import { matchScore } from '@/lib/search'
import { useWorkoutStore } from '@/features/workouts/store'
import { CATEGORY_META } from '@/features/workouts/categories'
import { useLeaderboardStore } from '@/features/leaderboard/store'
import { useAuthStore } from '@/features/auth/authStore'
import { actionEntries, JUMP_TO, PAGE_ENTRIES, type SearchGroup, type SearchItem } from './searchIndex'

export interface ResultGroup {
  key: SearchGroup
  label: string
  items: SearchItem[]
}

const GROUPS: { key: SearchGroup; label: string; limit: number }[] = [
  { key: 'actions', label: 'Actions', limit: 4 },
  { key: 'pages', label: 'Pages', limit: 6 },
  { key: 'routines', label: 'Routines', limit: 4 },
  { key: 'exercises', label: 'Exercises', limit: 6 },
  { key: 'foods', label: 'Foods', limit: 5 },
  { key: 'workouts', label: 'Past workouts', limit: 4 },
  { key: 'challenges', label: 'Challenges', limit: 3 },
  { key: 'friends', label: 'Friends', limit: 3 },
]

/** Exercises and foods are long lists; wait for two letters before searching them. */
const MIN_CHARS_LONG_LISTS = 2

/** Everything searchable that lives in the database; loaded only while search is open. */
function useSearchData(enabled: boolean) {
  return useLiveQuery(async () => {
    if (!enabled) return null
    const [routines, exercises, foods, workouts, challenges, liftedSets] = await Promise.all([
      db.routines.toArray(),
      db.exercises.toArray(),
      db.foods.toArray(),
      db.workouts.orderBy('createdAt').reverse().limit(300).toArray(),
      db.challenges.toArray(),
      db.workoutSets.filter(s => !!s.weight && !!s.reps).toArray(),
    ])
    return { routines, exercises, foods, workouts, challenges, lifted: new Set(liftedSets.map(s => s.exerciseId)) }
  }, [enabled])
}

type Scored = SearchItem & { score: number }

/** Results for `query`, grouped and ordered by their best hit; suggestions when it's empty. */
export function useSearch(query: string, enabled: boolean): ResultGroup[] {
  const data = useSearchData(enabled)
  const draft = useWorkoutStore(s => s.draft)
  const friends = useLeaderboardStore(s => s.rows)
  const userId = useAuthStore(s => s.userId)
  const actions = actionEntries(draft ? (draft.editing ? 'editing' : 'workout') : 'none').map(e => ({ ...e, group: 'actions' as const }))
  const pages = PAGE_ENTRIES.map(e => ({ ...e, group: 'pages' as const }))

  const q = query.trim()
  if (!q) {
    return [
      { key: 'actions', label: 'Quick actions', items: actions },
      { key: 'pages', label: 'Jump to', items: JUMP_TO.flatMap(id => pages.filter(p => p.id === id)) },
    ]
  }

  const found: Scored[] = []
  const add = (item: SearchItem, bonus = 0) => {
    const score = matchScore(q, item.title, item.keywords)
    if (score > 0) found.push({ ...item, score: score + bonus })
  }
  // Your own things beat catalogue matches: actions, your routines, logged lifts, favourite foods.
  actions.forEach(a => add(a, 10))
  pages.forEach(p => add(p))

  if (data) {
    for (const r of data.routines) {
      add({ id: r.uuid, group: 'routines', title: r.name, subtitle: `My routine · ${r.exercises.length} exercises`, keywords: CATEGORY_META[r.category]?.label, Icon: ListChecks, to: `/workouts/routine/${r.uuid}` }, 5)
    }
    for (const t of ROUTINE_TEMPLATES) {
      add({ id: t.uuid, group: 'routines', title: t.name, subtitle: `Template · ${CATEGORY_META[t.category].label}`, keywords: 'template', Icon: ListChecks, to: `/workouts/routine/${t.uuid}` })
    }
    for (const w of data.workouts) {
      const date = parseISO(w.date)
      add({
        id: w.uuid, group: 'workouts', title: w.name || 'Workout', subtitle: `${format(date, 'EEE d MMM yyyy')} · ${w.durationMin} min`,
        keywords: `workout session ${format(date, 'EEEE d MMMM')}`, Icon: History, to: `/workouts/summary/${w.uuid}`,
      })
    }
    for (const c of data.challenges) {
      add({ id: c.uuid, group: 'challenges', title: c.title, subtitle: `Challenge · ends ${format(parseISO(c.endDate), 'd MMM')}`, keywords: 'challenge goal', Icon: Flag, to: '/challenges' })
    }
    if (q.length >= MIN_CHARS_LONG_LISTS) {
      for (const e of data.exercises) {
        const lifted = data.lifted.has(e.uuid)
        add({
          id: e.uuid, group: 'exercises', title: e.name,
          subtitle: lifted ? `Strength progress · ${e.category}` : `Exercise · ${e.category}`,
          keywords: `${e.category} ${e.muscles?.join(' ') ?? ''}`, Icon: Dumbbell,
          // Logged lifts open their chart; the rest show how to do them.
          ...(lifted ? { to: `/analytics?lift=${encodeURIComponent(e.uuid)}#strength-progress` } : { exercise: e }),
        }, lifted ? 15 : 0)
      }
      for (const f of data.foods) {
        add({
          id: f.uuid, group: 'foods', title: f.name, subtitle: `Log food · ${Math.round(f.kcalPerServing)} kcal per ${f.servingSize} ${f.servingUnit}`,
          Icon: UtensilsCrossed, to: `/nutrition?add=1&q=${encodeURIComponent(f.name)}`,
        }, f.isFavorite ? 10 : 0)
      }
    }
  }
  for (const e of userId ? friends ?? [] : []) {
    add({ id: e.userId, group: 'friends', title: e.name, subtitle: 'Friend · leaderboard profile', keywords: 'friend', Icon: UserRound, to: `/leaderboard/${e.userId === userId ? 'me' : e.userId}` })
  }

  return GROUPS
    .map(g => {
      const items = found.filter(i => i.group === g.key).sort((a, b) => b.score - a.score)
      return { key: g.key, label: g.label, best: items[0]?.score ?? 0, items: items.slice(0, g.limit) }
    })
    .filter(g => g.items.length > 0)
    .sort((a, b) => b.best - a.best) // stable: ties keep the group order above
    .map(({ key, label, items }) => ({ key, label, items }))
}
