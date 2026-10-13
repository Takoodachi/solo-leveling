import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import DatePicker from '@/components/DatePicker'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import NumberStepper from '@/components/NumberStepper'
import Segmented from '@/components/Segmented'
import { useBodyMetrics } from '@/features/bodyMetrics/useBodyMetrics'
import { TRAINING_LEVELS, levelSince } from '@/features/analytics/volume'
import { useExpenditure } from '@/features/nutrition/expenditure'
import { useTargets } from '@/features/nutrition/hooks/useTargets'
import { useNow } from '@/hooks/useNow'
import { toDateStr } from '@/lib/date'
import { cn } from '@/lib/utils'
import { countsSteps } from '@/lib/stepCalories'
import { useSettings } from '../hooks/useSettings'
import { LOWEST_BELIEVABLE, formulaMaintenance, restingKcal, suggestedTargets, type GoalType, type Sex } from '../targetSuggestion'
import ExpenditureNote from './ExpenditureNote'

const GOALS: { value: GoalType; label: string }[] = [
  { value: 'cut', label: 'Cut' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'bulk', label: 'Bulk' },
]

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-sky-600 dark:text-sky-400' }
  if (bmi < 25) return { label: 'Normal', color: 'text-emerald-600 dark:text-emerald-400' }
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-600 dark:text-amber-300' }
  return { label: 'Obese', color: 'text-red-600 dark:text-red-400' }
}

export default function BodyGoalsCard() {
  const { settings, updateSettings } = useSettings()
  const { metrics } = useBodyMetrics(1)
  const { updateTargets } = useTargets()
  const measured = useExpenditure()
  const now = useNow()

  const weight = metrics[0]?.weightKg
  const { heightCm, sex, goalType, trainingSince } = settings ?? {}
  const level = TRAINING_LEVELS.find(l => l.value === levelSince(trainingSince, now))
  const bmi = weight && heightCm ? Math.round((weight / (heightCm / 100) ** 2) * 10) / 10 : null
  const cat = bmi ? bmiCategory(bmi) : null
  const known = weight && heightCm && sex ? { weight, heightCm, sex } : null
  // What the logs say is burned is used once there's enough of them, unless it comes to less
  // than a resting body burns (then food went unlogged, and the formula is the safer guess)
  const believable = !!measured?.ready && !!known && measured.kcal >= restingKcal(known.weight, known.heightCm, known.sex) * LOWEST_BELIEVABLE
  const fromLogs = measured?.ready && believable ? measured.maintenance : null

  async function apply() {
    if (!known || !goalType) return
    const maintenance = fromLogs ?? formulaMaintenance(known.weight, known.heightCm, known.sex, countsSteps(settings))
    await updateTargets(suggestedTargets(known.weight, goalType, maintenance))
    toast.success(fromLogs ? 'Targets updated from your logs' : 'Targets updated from your profile')
  }

  return (
    <div className="flex flex-col gap-5 rounded-3xl bg-card p-5">
      <div className="flex flex-col gap-1.5">
        <Label>Height (cm)</Label>
        <NumberStepper value={String(heightCm ?? '')} onChange={v => void updateSettings({ heightCm: Number(v) || undefined })} min={100} max={250} inputMode="numeric" placeholder="175" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Biological sex</Label>
        <Segmented size="sm" value={sex ?? ('' as Sex)} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} onChange={v => void updateSettings({ sex: v })} className="bg-secondary" />
      </div>
      {bmi && cat && (
        <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
          <span className="text-sm text-muted-foreground">BMI</span>
          <span className="flex items-center gap-2 font-semibold">{bmi}<Badge variant="outline" className={cn('text-xs', cat.color)}>{cat.label}</Badge></span>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="training-since">Training since</Label>
        <DatePicker
          id="training-since"
          value={trainingSince || undefined}
          max={toDateStr(now)}
          onChange={day => void updateSettings({ trainingSince: day })}
          onClear={() => void updateSettings({ trainingSince: '' })}
        />
        <p className="text-xs text-muted-foreground">
          {level
            ? `${level.label}: the weekly set targets on Analytics follow from this. Clear the date to pick the level there yourself.`
            : 'Roughly when you started lifting. It decides whether Analytics holds your weekly sets to a beginner’s, an intermediate’s or an advanced lifter’s targets.'}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Goal</Label>
        <Segmented size="sm" value={goalType ?? ('' as GoalType)} options={GOALS} onChange={v => void updateSettings({ goalType: v })} className="bg-secondary" />
      </div>
      {known && goalType ? (
        <div className="flex flex-col gap-2">
          <ExpenditureNote measured={measured} believable={believable} />
          <Button variant="secondary" onClick={() => void apply()}>Apply suggested targets for {goalType}</Button>
          {countsSteps(settings) && <p className="text-xs text-muted-foreground">Leaves walking out, since your steps are subtracted day by day.</p>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {!weight ? 'Log your weight (Analytics → Body weight) to get target suggestions.' : 'Fill in height, sex and goal to get target suggestions.'}
        </p>
      )}
    </div>
  )
}
