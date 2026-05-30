import { useNavigate } from 'react-router-dom'
import { Dumbbell, History, ClipboardEdit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkoutsWithSummary } from '@/features/workouts/hooks/useWorkoutsWithSummary'
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout'
import { useWorkoutStore } from '@/features/workouts/store'
import { today } from '@/lib/date'
import WorkoutCard from '@/features/workouts/components/WorkoutCard'
import SectionHeader from '@/components/SectionHeader'

export default function WorkoutsPage() {
  const navigate = useNavigate()
  const recentWorkouts = useWorkoutsWithSummary(5)
  const { repeatLastWorkout } = useActiveWorkout()
  const { startWorkout, startLogWorkout } = useWorkoutStore()

  function handleStart() {
    startWorkout()
    navigate('/workouts/active')
  }

  function handleLogPast() {
    startLogWorkout(today())
    navigate('/workouts/log')
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

      <Button variant="outline" onClick={handleLogPast} className="gap-2 w-full">
        <ClipboardEdit size={16} />
        Log past workout
      </Button>

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
          {recentWorkouts.map(w => (
            <WorkoutCard
              key={w.uuid}
              workout={w}
              setCount={w.setCount}
              exerciseNames={w.exerciseNames}
              onClick={() => navigate(`/workouts/${w.uuid}`)}
            />
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
