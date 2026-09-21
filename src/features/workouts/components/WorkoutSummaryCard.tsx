import type { WorkoutWithSets } from '@/types'
import { formatVolume, totalReps, totalVolume } from '@/lib/workoutMath'
import VolumeBySetChart from './VolumeBySetChart'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  )
}

export default function WorkoutSummaryCard({ workout }: { workout: WorkoutWithSets }) {
  const exerciseCount = new Set(workout.sets.map(s => s.exerciseId)).size
  const volume = totalVolume(workout.sets)
  const reps = totalReps(workout.sets)

  return (
    <section className="rounded-3xl bg-black/60 p-5 ring-1 ring-white/5">
      <h2 className="mb-5 text-center text-xl font-semibold">Workout Summary</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <Stat label="Duration:" value={`${workout.durationMin} min`} />
        <Stat label="Sets finished:" value={`${workout.sets.length} sets`} />
        <Stat label="Calories burned (est.):" value={workout.kcalEst ? `${workout.kcalEst} kcal` : '—'} />
        <Stat label="Avg. heart rate:" value={workout.avgHeartRate ? `${workout.avgHeartRate} BPM` : 'Not recorded'} />
        <Stat label="Exercises:" value={String(exerciseCount)} />
        <Stat label={volume > 0 ? 'Volume:' : 'Total reps:'} value={volume > 0 ? formatVolume(volume) : String(reps)} />
      </div>
      <div className="mt-6">
        <p className="mb-2 text-xs text-muted-foreground">{volume > 0 ? 'Volume per set (kg)' : 'Minutes per set'}</p>
        <VolumeBySetChart sets={workout.sets} />
      </div>
    </section>
  )
}
