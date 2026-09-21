import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import NumberStepper from '@/components/NumberStepper'
import Segmented from '@/components/Segmented'
import { useBodyMetrics } from '@/features/bodyMetrics/useBodyMetrics'
import { useTargets } from '@/features/nutrition/hooks/useTargets'
import { cn } from '@/lib/utils'
import type { Settings } from '@/types'
import { useSettings } from '../hooks/useSettings'

type GoalType = NonNullable<Settings['goalType']>
type Sex = NonNullable<Settings['sex']>

const GOALS: { value: GoalType; label: string }[] = [
  { value: 'cut', label: 'Cut' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'bulk', label: 'Bulk' },
]

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-sky-400' }
  if (bmi < 25) return { label: 'Normal', color: 'text-emerald-400' }
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-300' }
  return { label: 'Obese', color: 'text-red-400' }
}

// Mifflin-St Jeor with a moderate activity factor (unchanged from the previous Settings page).
function suggestedTargets(weightKg: number, heightCm: number, sex: Sex, goal: GoalType) {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * 30 + (sex === 'male' ? 5 : -161)
  const tdee = Math.round(bmr * 1.55)
  const offsets: Record<GoalType, number> = { cut: -500, maintain: 0, bulk: 300 }
  const proteinPer: Record<GoalType, number> = { cut: 2.2, maintain: 1.8, bulk: 1.6 }
  const fatPer: Record<GoalType, number> = { cut: 0.8, maintain: 1.0, bulk: 1.0 }
  const dailyKcal = Math.round(tdee + offsets[goal])
  const dailyProtein = Math.round(proteinPer[goal] * weightKg)
  const dailyFat = Math.round(fatPer[goal] * weightKg)
  const dailyCarbs = Math.round(Math.max(0, dailyKcal - dailyProtein * 4 - dailyFat * 9) / 4)
  return { dailyKcal, dailyProtein, dailyCarbs, dailyFat }
}

export default function BodyGoalsCard() {
  const { settings, updateSettings } = useSettings()
  const { metrics } = useBodyMetrics(1)
  const { updateTargets } = useTargets()

  const weight = metrics[0]?.weightKg
  const { heightCm, sex, goalType } = settings ?? {}
  const bmi = weight && heightCm ? Math.round((weight / (heightCm / 100) ** 2) * 10) / 10 : null
  const cat = bmi ? bmiCategory(bmi) : null

  async function apply() {
    if (!weight || !heightCm || !sex || !goalType) return
    await updateTargets(suggestedTargets(weight, heightCm, sex, goalType))
    toast.success('Targets updated from your profile')
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
        <Label>Goal</Label>
        <Segmented size="sm" value={goalType ?? ('' as GoalType)} options={GOALS} onChange={v => void updateSettings({ goalType: v })} className="bg-secondary" />
      </div>
      {weight && heightCm && sex && goalType ? (
        <Button variant="secondary" onClick={() => void apply()}>Apply suggested targets for {goalType}</Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          {!weight ? 'Log your weight (Analytics → Body weight) to get target suggestions.' : 'Fill in height, sex and goal to get target suggestions.'}
        </p>
      )}
    </div>
  )
}
