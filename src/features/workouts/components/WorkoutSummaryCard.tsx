import type { WorkoutWithSets } from '@/types'
import { formatVolume, totalReps, totalVolume } from '@/lib/workoutMath'
import { formatKm } from '@/lib/cardio'
import VolumeBySetChart from './VolumeBySetChart'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  )
}

/** Strength is measured in sets and volume; cardio in time and distance. */
export default function WorkoutSummaryCard({ workout }: { workout: WorkoutWithSets }) {
  const exerciseCount = new Set(workout.sets.map(s => s.exerciseId)).size
  const cardio = workout.sets.filter(s => s.exercise.type === 'cardio')
  const lifts = workout.sets.filter(s => s.exercise.type !== 'cardio')
  const volume = totalVolume(lifts)
  const cardioMin = Math.round(cardio.reduce((sum, s) => sum + (s.duration ?? 0), 0))
  const km = cardio.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0)

  const stats: [string, string][] = [
    ['Duration:', `${workout.durationMin} min`],
    ['Calories burned (est.):', workout.kcalEst ? `${workout.kcalEst} kcal` : '—'],
    ['Avg. heart rate:', workout.avgHeartRate ? `${workout.avgHeartRate} BPM` : 'Not recorded'],
    ['Exercises:', String(exerciseCount)],
  ]
  if (lifts.length > 0) {
    stats.push(['Sets finished:', `${lifts.length} sets`])
    stats.push(volume > 0 ? ['Volume:', formatVolume(volume)] : ['Total reps:', String(totalReps(lifts))])
  }
  if (cardio.length > 0) {
    stats.push(['Cardio time:', `${cardioMin} min`])
    if (km > 0) stats.push(['Distance:', formatKm(km)])
  }

  return (
    <section className="rounded-3xl bg-black/60 p-5 ring-1 ring-white/5">
      <h2 className="mb-5 text-center text-xl font-semibold">Workout Summary</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {stats.map(([label, value]) => <Stat key={label} label={label} value={value} />)}
      </div>
      {lifts.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs text-muted-foreground">{volume > 0 ? 'Volume per set (kg)' : 'Minutes per set'}</p>
          <VolumeBySetChart sets={lifts} />
        </div>
      )}
    </section>
  )
}
