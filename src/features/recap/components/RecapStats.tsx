import { format, parseISO } from 'date-fns'
import { Beef, Dumbbell, Flame, Footprints, GlassWater, Pill, Route, Scale, Timer, Weight, type LucideIcon } from 'lucide-react'
import { formatDurationMin } from '@/lib/format'
import { formatVolume } from '@/lib/workoutMath'
import type { Recap } from '../recap'

function Tile({ Icon, label, value, note }: { Icon: LucideIcon; label: string; value: string; note?: string | null }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><Icon size={18} /></span>
      <div>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  )
}

/** "12% more than the week before", stated the same way up or down (no red for a quieter week). */
function versus(now: number, before: number, period: string): string | null {
  if (before <= 0 || now <= 0) return null
  const change = Math.round((now / before - 1) * 100)
  if (change === 0) return `Same as the ${period} before`
  return `${Math.abs(change)}% ${change > 0 ? 'more' : 'less'} than the ${period} before`
}

const signed = (n: number, unit: string) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)} ${unit}`

interface Props {
  recap: Recap
  /** Days of the period so far, counted from the first one with anything logged. */
  elapsedDays: number
  /** The period is over. One still going isn't set against the whole one before it. */
  finished: boolean
}

export default function RecapStats({ recap, elapsedDays, finished }: Props) {
  const { training, previous, steps, food, weight, period } = recap
  const more = training.workouts - previous.workouts
  const than = (now: number, before: number) => (finished ? versus(now, before, period) : null)
  // A month or year only partly logged (or still going) gets its share of the goal
  const goal = period === 'week' ? recap.workoutGoal : Math.max(1, Math.round((recap.workoutGoal * elapsedDays) / recap.dates.length))
  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile
        Icon={Dumbbell}
        label="Workouts"
        value={`${training.workouts} / ${goal}`}
        note={finished && previous.workouts > 0 ? (more === 0 ? `Same as the ${period} before` : `${Math.abs(more)} ${more > 0 ? 'more' : 'fewer'} than the ${period} before`) : null}
      />
      <Tile Icon={Timer} label="Training time" value={formatDurationMin(Math.round(training.activeMin))} note={than(training.activeMin, previous.activeMin)} />
      {training.sets > 0 && (
        <Tile Icon={Weight} label={`Lifted in ${training.sets} sets`} value={formatVolume(training.volume)} note={than(training.volume, previous.volume)} />
      )}
      {training.cardioKm > 0 && (
        <Tile Icon={Route} label="Cardio distance" value={`${training.cardioKm.toFixed(1)} km`} note={than(training.cardioKm, previous.cardioKm)} />
      )}
      {steps.total > 0 && (
        <>
          <Tile Icon={Footprints} label="Steps a day" value={Math.round(steps.total / Math.max(1, elapsedDays)).toLocaleString()} note={than(steps.total, previous.steps)} />
          <Tile
            Icon={Footprints}
            label={`Days at ${steps.goal.toLocaleString()} steps`}
            value={`${steps.goalDays} / ${elapsedDays}`}
            note={steps.best && `Most: ${format(parseISO(steps.best.date), period === 'week' ? 'EEE' : 'EEE d MMM')}, ${steps.best.steps.toLocaleString()}`}
          />
        </>
      )}
      {food && (
        <>
          <Tile
            Icon={Flame}
            label={`Calories a day, ${food.days} day${food.days === 1 ? '' : 's'} logged`}
            value={food.avgNetKcal.toLocaleString()}
            note={food.targetKcal > 0 ? `Target ${food.targetKcal.toLocaleString()}` : null}
          />
          <Tile Icon={Beef} label="Protein a day" value={`${food.avgProtein} g`} note={`Target reached on ${food.proteinDays} of ${food.days}`} />
        </>
      )}
      {weight && <Tile Icon={Scale} label="Body weight" value={`${weight.to.toFixed(1)} kg`} note={weight.to === weight.from ? null : `${signed(weight.to - weight.from, 'kg')} over the ${period}`} />}
      {recap.creatineDays > 0 && <Tile Icon={Pill} label="Creatine" value={`${recap.creatineDays} / ${elapsedDays} days`} />}
      {recap.waterGoalDays > 0 && <Tile Icon={GlassWater} label="Water goal" value={`${recap.waterGoalDays} / ${elapsedDays} days`} />}
    </div>
  )
}
