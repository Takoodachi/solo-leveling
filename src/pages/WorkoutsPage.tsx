import { useNavigate } from 'react-router-dom'
import { Dumbbell, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkouts } from '@/features/workouts/hooks/useWorkouts'
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout'
import { useWorkoutStore } from '@/features/workouts/store'
import WorkoutCard from '@/features/workouts/components/WorkoutCard'
import SectionHeader from '@/components/SectionHeader'

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
          <SectionHeader
            action={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => navigate('/workouts/history')}
              >
                <History size={13} />
                View all
              </Button>
            }
          >
            Recent
          </SectionHeader>
          {recentWorkouts.map(workout => (
            <WorkoutCard key={workout.uuid} workout={workout} />
          ))}
        </div>
      )}

      {recentWorkouts.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-3">
          <div className="p-4 rounded-full bg-muted/50">
            <Dumbbell size={28} className="text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">No workouts yet</p>
            <p className="text-xs text-muted-foreground mt-1">Hit Start Workout to log your first session</p>
          </div>
        </div>
      )}
    </div>
  )
}
