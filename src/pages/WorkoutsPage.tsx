import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, Plus } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
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

function scheduleLabel(days: number[]): string | undefined {
  if (days.length === 0) return undefined
  if (days.length === 7) return 'Every day'
  return WEEK_ORDER.filter(d => days.includes(d)).map(d => WEEKDAY_SHORT[d]).join(' · ')
}

export default function WorkoutsPage() {
  const routines = useRoutines()
  const recent = useWorkoutList(3)
  const minutesFor = useRoutineMinutes()
  const [category, setCategory] = useState<RoutineCategory | null>(null)
  const [params, setParams] = useSearchParams()
  const startOpen = params.get('start') === '1'

  const byCategory = <T extends { category: RoutineCategory }>(list: T[]) =>
    category ? list.filter(r => r.category === category) : list
  const myRoutines = byCategory(routines)
  const templates = byCategory(ROUTINE_TEMPLATES)
  const todayRoutine = routines.find(r => r.scheduleDays.includes(new Date().getDay()))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
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
              ? 'No routines yet. Save a template below or build your own.'
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
              footer={scheduleLabel(r.scheduleDays)}
            />
          ))
        )}
      </section>

      {templates.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader>Templates</SectionHeader>
          {templates.map(t => (
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
      )}

      {recent && recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader actionLabel="View all" to="/workouts/history">Recent</SectionHeader>
          {recent.map(w => <WorkoutHistoryRow key={w.uuid} workout={w} />)}
        </section>
      )}

      <StartWorkoutSheet
        open={startOpen}
        onOpenChange={o => setParams(o ? { start: '1' } : {}, { replace: true })}
        routines={routines}
        todayRoutine={todayRoutine}
      />
    </div>
  )
}
