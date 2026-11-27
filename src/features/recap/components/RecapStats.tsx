import { format, parseISO } from 'date-fns'
import { Beef, Dumbbell, Flame, Footprints, GlassWater, Moon, Pill, Route, Scale, Timer, Weight } from 'lucide-react'
import IconTile from '@/components/IconTile'
import { formatDurationMin } from '@/lib/format'
import { formatVolume } from '@/lib/workoutMath'
import { bodyText, inUnit, useUnits } from '@/features/settings/units'
import type { Recap } from '../recap'

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
  const unit = useUnits(s => s.weight)
  const more = training.workouts - previous.workouts
  const than = (now: number, before: number) => (finished ? versus(now, before, period) : null)
  // A month or year only partly logged (or still going) gets its share of the goal; with training
  // paused throughout there's none. shortcut: paused days come off the whole period before that
  // share is taken, so a pause plus a late start in one month lowers the goal a little too much;
  // count the paused days inside the share if that ever reads wrong.
  const goal = period === 'week' || recap.workoutGoal === 0 ? recap.workoutGoal : Math.max(1, Math.round((recap.workoutGoal * elapsedDays) / recap.dates.length))
  return (
    <div className="grid grid-cols-2 gap-3">
      <IconTile
        Icon={Dumbbell}
        label="Workouts"
        value={goal > 0 ? `${training.workouts} / ${goal}` : String(training.workouts)}
        note={finished && previous.workouts > 0 ? (more === 0 ? `Same as the ${period} before` : `${Math.abs(more)} ${more > 0 ? 'more' : 'fewer'} than the ${period} before`) : null}
      />
      <IconTile Icon={Timer} label="Training time" value={formatDurationMin(Math.round(training.activeMin))} note={than(training.activeMin, previous.activeMin)} />
      {training.sets > 0 && (
        <IconTile Icon={Weight} label={`Lifted in ${training.sets} sets`} value={formatVolume(training.volume, unit)} note={than(training.volume, previous.volume)} />
      )}
      {training.cardioKm > 0 && (
        <IconTile Icon={Route} label="Cardio distance" value={`${training.cardioKm.toFixed(1)} km`} note={than(training.cardioKm, previous.cardioKm)} />
      )}
      {steps.total > 0 && (
        <>
          <IconTile Icon={Footprints} label="Steps a day" value={Math.round(steps.total / Math.max(1, elapsedDays)).toLocaleString()} note={than(steps.total, previous.steps)} />
          <IconTile
            Icon={Footprints}
            label={`Days at ${steps.goal.toLocaleString()} steps`}
            value={`${steps.goalDays} / ${elapsedDays}`}
            note={steps.best && `Most: ${format(parseISO(steps.best.date), period === 'week' ? 'EEE' : 'EEE d MMM')}, ${steps.best.steps.toLocaleString()}`}
          />
        </>
      )}
      {food && (
        <>
          <IconTile
            Icon={Flame}
            label={`Calories a day, ${food.days} day${food.days === 1 ? '' : 's'} logged`}
            value={food.avgNetKcal.toLocaleString()}
            note={food.targetKcal > 0 ? `Target ${food.targetKcal.toLocaleString()}` : null}
          />
          <IconTile Icon={Beef} label="Protein a day" value={`${food.avgProtein} g`} note={`Target reached on ${food.proteinDays} of ${food.days}`} />
        </>
      )}
      {weight && <IconTile Icon={Scale} label="Body weight" value={bodyText(weight.to, unit)} note={weight.to === weight.from ? null : `${signed(inUnit(weight.to - weight.from, unit), unit)} over the ${period}`} />}
      {recap.creatineDays > 0 && <IconTile Icon={Pill} label="Creatine" value={`${recap.creatineDays} / ${elapsedDays} days`} />}
      {recap.magnesiumDays > 0 && <IconTile Icon={Moon} label="Magnesium" value={`${recap.magnesiumDays} / ${elapsedDays} days`} />}
      {recap.waterGoalDays > 0 && <IconTile Icon={GlassWater} label="Water goal" value={`${recap.waterGoalDays} / ${elapsedDays} days`} />}
    </div>
  )
}
