import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronDown, LayoutTemplate, Plus } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Collapse from '@/components/Collapse'
import { useEntryState } from '@/hooks/useEntryState'
import { cn } from '@/lib/utils'
import { useIsNavTab } from '@/hooks/useNavTabs'
import SectionHeader from '@/components/SectionHeader'
import { Button } from '@/components/ui/button'
import type { RoutineCategory } from '@/types'
import { ROUTINE_TEMPLATES } from '@/data/routineTemplates'
import { useRoutines } from '@/features/workouts/hooks/useRoutines'
import { useRoutineMinutes } from '@/features/workouts/hooks/useExercises'
import { useWorkoutList } from '@/features/workouts/hooks/useWorkoutHistory'
import { WEEKDAY_SHORT, WEEK_ORDER } from '@/features/workouts/categories'
import CategoryChips from '@/features/workouts/components/CategoryChips'
import RoutineCard from '@/features/workouts/components/RoutineCard'
import ResumeBanner from '@/features/workouts/components/ResumeBanner'
import StartWorkoutSheet from '@/features/workouts/components/StartWorkoutSheet'
import WorkoutHistoryRow from '@/features/workouts/components/WorkoutHistoryRow'
import SharedRoutines from '@/features/leaderboard/components/SharedRoutines'
import { useFriendsRoutines } from '@/features/leaderboard/sharedRoutines'

function scheduleLabel(days: number[]): string | undefined {
  if (days.length === 0) return undefined
  if (days.length === 7) return 'Every day'
  return WEEK_ORDER.filter(d => days.includes(d)).map(d => WEEKDAY_SHORT[d]).join(' · ')
}

const footer = (r: { scheduleDays: number[]; shared?: boolean }) =>
  [scheduleLabel(r.scheduleDays), r.shared && 'Shared with friends'].filter(Boolean).join(' · ') || undefined

export default function WorkoutsPage() {
  const routines = useRoutines()
  const recent = useWorkoutList(3)
  const minutesFor = useRoutineMinutes()
  const [category, setCategory] = useState<RoutineCategory | null>(null)
  const [params, setParams] = useSearchParams()
  const startOpen = params.get('start') === '1'
  // Templates (and what friends share) wait behind a button; open, they stay open for Back from one
  const [browsing, setBrowsing] = useEntryState('workouts-templates', false)
  const friends = useFriendsRoutines()
  const fromFriends = friends.reduce((n, f) => n + f.routines.length, 0)

  const byCategory = <T extends { category: RoutineCategory }>(list: T[]) =>
    category ? list.filter(r => r.category === category) : list
  const myRoutines = byCategory(routines)
  const templates = byCategory(ROUTINE_TEMPLATES)
  const isTab = useIsNavTab('/workouts')
  const todayRoutine = routines.find(r => r.scheduleDays.includes(new Date().getDay()))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={isTab ? undefined : '/home'}
        title="Workouts"
        action={
          <Link to="/workouts/plan" className="flex h-11 items-center gap-2 rounded-2xl bg-card px-3.5 text-sm font-semibold" aria-label="Weekly plan">
            <CalendarDays size={18} /> Plan
          </Link>
        }
      />

      <ResumeBanner />

      <section className="flex flex-col gap-3">
        <SectionHeader actionLabel="History" to="/workouts/history">My activity</SectionHeader>
        <CategoryChips value={category} onChange={setCategory} />
      </section>

      <Button size="lg" className="gap-2" onClick={() => setParams({ start: '1' })}>
        <Plus size={18} /> Start a workout
      </Button>

      <section className="flex flex-col gap-3">
        <SectionHeader actionLabel="+ New" to="/workouts/routine/new">My routines</SectionHeader>
        {myRoutines.length === 0 ? (
          <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">
            {routines.length === 0
              ? 'No routines yet. Build your own, or start from a template below.'
              : 'No routines in this category.'}
          </p>
        ) : (
          myRoutines.map(r => (
            <RoutineCard
              key={r.uuid}
              to={`/workouts/routine/${r.uuid}`}
              name={r.name}
              category={r.category}
              level={r.level}
              minutes={minutesFor(r)}
              footer={footer(r)}
            />
          ))
        )}
      </section>

      {recent && recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader actionLabel="View all" to="/workouts/history">Recent</SectionHeader>
          {recent.map(w => <WorkoutHistoryRow key={w.uuid} workout={w} />)}
        </section>
      )}

      <div>
        <button
          type="button"
          onClick={() => setBrowsing(!browsing)}
          aria-expanded={browsing}
          className="flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <LayoutTemplate size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Need a template for workouts?</span>
            <span className="block text-xs text-muted-foreground">
              {fromFriends ? `${ROUTINE_TEMPLATES.length} ready-made, and ${fromFriends} shared by friends` : `${ROUTINE_TEMPLATES.length} ready-made routines to start from`}
            </span>
          </span>
          <ChevronDown size={18} className={cn('shrink-0 text-muted-foreground transition-transform duration-200', browsing && 'rotate-180')} />
        </button>
        <Collapse open={browsing} className="flex flex-col gap-6 pt-6">
          {friends.map(f => (
            <section key={f.userId} className="flex flex-col gap-3">
              <SectionHeader>From {f.name}</SectionHeader>
              <SharedRoutines routines={f.routines} name={f.name} self={false} />
            </section>
          ))}
          <section className="flex flex-col gap-3">
            <SectionHeader>Templates</SectionHeader>
            {templates.length === 0 ? (
              <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">No templates in this category.</p>
            ) : templates.map(t => (
              <RoutineCard
                key={t.uuid}
                to={`/workouts/routine/${t.uuid}`}
                name={t.name}
                category={t.category}
                level={t.level}
                minutes={minutesFor(t)}
              />
            ))}
          </section>
        </Collapse>
      </div>

      <StartWorkoutSheet
        open={startOpen}
        onOpenChange={o => setParams(o ? { start: '1' } : {}, { replace: true })}
        routines={routines}
        todayRoutine={todayRoutine}
      />
    </div>
  )
}
