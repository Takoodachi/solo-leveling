import { useState } from 'react'
import { ChevronRight, Repeat, CalendarDays, Pencil, Moon } from 'lucide-react'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import NumberStepper from '@/components/NumberStepper'
import { Badge } from '@/components/ui/badge'
import { useRoutines } from '@/features/workouts/hooks/useRoutines'
import { useRoutineMinutes } from '@/features/workouts/hooks/useExercises'
import { useSettings, updateSettings, DEFAULT_REST_SECONDS } from '@/features/settings/hooks/useSettings'
import { CATEGORY_META, WEEKDAY_SHORT, WEEK_ORDER } from '@/features/workouts/categories'
import RoutineArt from '@/features/workouts/components/RoutineArt'
import DayRoutineSheet from '@/features/workouts/components/DayRoutineSheet'
import ReminderSettings from '@/features/workouts/components/ReminderSettings'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function PlanPage() {
  const routines = useRoutines()
  const minutesFor = useRoutineMinutes()
  const { settings } = useSettings()
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [editingGoal, setEditingGoal] = useState(false)

  const byDay = new Map(WEEK_ORDER.map(d => [d, routines.find(r => r.scheduleDays.includes(d))]))
  const trainingDays = WEEK_ORDER.filter(d => byDay.get(d))
  const weeklyMinutes = trainingDays.reduce<number>((sum, d) => sum + minutesFor(byDay.get(d)!), 0)
  const goal = settings?.weeklyWorkoutGoal ?? Math.max(trainingDays.length, 3)

  return (
    <FullScreen className="flex flex-col gap-6">
      <PageHeader back="/workouts" title="Your plan" />

      <div className="relative min-h-[140px] overflow-hidden rounded-3xl bg-card p-5">
        <RoutineArt category="core" />
        <div className="relative flex flex-col gap-3">
          <Badge variant="tag" className="w-fit gap-1.5"><CalendarDays size={13} /> Weekly</Badge>
          <h2 className="mt-4 text-lg font-semibold">My personal plan</h2>
          <p className="text-sm text-foreground/85">{trainingDays.length} sessions · ~{weeklyMinutes} min per week</p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Schedule</h2>
        <div className="overflow-hidden rounded-3xl bg-card">
          {WEEK_ORDER.map(d => {
            const r = byDay.get(d)
            const Icon = r ? CATEGORY_META[r.category].Icon : Moon
            return (
              <button
                key={d}
                type="button"
                onClick={() => setEditingDay(d)}
                className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3.5 text-left last:border-0 hover:bg-accent/50"
              >
                <span className="w-10 text-sm font-semibold text-muted-foreground">{WEEKDAY_SHORT[d]}</span>
                <Icon size={18} className={r ? 'text-primary' : 'text-muted-foreground'} />
                <span className={r ? 'flex-1 truncate font-medium' : 'flex-1 text-muted-foreground'}>{r?.name ?? 'Rest'}</span>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Frequency of training</h2>
        <div className="rounded-3xl bg-card p-4">
          <div className="flex items-start justify-between px-1">
            <div>
              <p className="font-semibold">{goal} times</p>
              <p className="text-sm text-muted-foreground">per week (goal)</p>
            </div>
            <button type="button" onClick={() => setEditingGoal(v => !v)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent" aria-label="Edit weekly goal">
              <Pencil size={18} />
            </button>
          </div>
          {editingGoal && (
            <NumberStepper className="mt-3" value={String(goal)} min={1} max={14} inputMode="numeric"
              onChange={v => void updateSettings({ weeklyWorkoutGoal: Math.max(1, Math.min(14, Math.round(Number(v) || 1))) })} />
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-medium">
            <span className="flex items-center gap-2"><Repeat size={17} className="text-muted-foreground" />{trainingDays.length === 7 ? 'Daily' : `${trainingDays.length}× scheduled`}</span>
            <span className="flex items-center gap-2"><CalendarDays size={17} className="text-muted-foreground" />
              {trainingDays.length === 0 ? 'No days yet' : trainingDays.length === 7 ? 'Every day' : trainingDays.map(d => WEEKDAY_SHORT[d]).join(', ')}
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Rest timer</h2>
        <div className="rounded-3xl bg-card p-4">
          <p className="mb-2 px-1 text-sm text-muted-foreground">Default rest between sets (seconds)</p>
          <NumberStepper value={String(settings?.defaultRestSeconds ?? DEFAULT_REST_SECONDS)} step={15} min={0} max={600} inputMode="numeric"
            onChange={v => void updateSettings({ defaultRestSeconds: Math.max(0, Math.round(Number(v) || 0)) })} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Reminders</h2>
        <ReminderSettings settings={settings} />
      </section>

      <DayRoutineSheet
        day={editingDay}
        dayLabel={editingDay == null ? '' : DAY_NAMES[editingDay]}
        routines={routines}
        onClose={() => setEditingDay(null)}
      />
    </FullScreen>
  )
}
