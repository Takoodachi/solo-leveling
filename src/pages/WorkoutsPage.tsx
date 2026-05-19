import { useNavigate } from 'react-router-dom'
import { Dumbbell, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkouts } from '@/features/workouts/hooks/useWorkouts'
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout'
import { useWorkoutStore } from '@/features/workouts/store'
import WorkoutCard from '@/features/workouts/components/WorkoutCard'

export default function WorkoutsPage() {
  const navigate = useNavigate()
  const recentWorkouts = useWorkouts(5)
  const { repeatLastWorkout } = useActiveWorkout()
  const { startWorkout } = useWorkoutStore()

  function handleStart() {
    startWorkout()
    navigate('/workouts/active')
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-xl font-bold">Workouts</h1>

      <div className="flex gap-2">
        <Button onClick={handleStart} className="flex-1 gap-2">
          <Dumbbell size={18} />
          Start Workout
        </Button>
        {recentWorkouts.length > 0 && (
          <Button variant="outline" onClick={repeatLastWorkout} className="gap-2">
            Repeat Last
          </Button>
        )}
      </div>

      {recentWorkouts.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => navigate('/workouts/history')}
            >
              <History size={13} />
              View all
            </Button>
          </div>
          {recentWorkouts.map(workout => (
            <WorkoutCard key={workout.uuid} workout={workout} />
          ))}
        </div>
      )}

      {recentWorkouts.length === 0 && (
        <div className="flex flex-col items-center py-12 gap-2">
          <Dumbbell size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No workouts yet — start your first one!</p>
        </div>
      )}
    </div>
  )
}
