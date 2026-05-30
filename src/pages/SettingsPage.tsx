import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import TargetForm from '@/features/settings/components/TargetForm'
import ExportButton from '@/features/settings/components/ExportButton'
import ImportButton from '@/features/settings/components/ImportButton'
import NumberStepper from '@/components/NumberStepper'
import SectionHeader from '@/components/SectionHeader'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useAuth } from '@/features/auth/useAuth'
import { useBodyMetrics } from '@/features/bodyMetrics/useBodyMetrics'
import { useTargets } from '@/features/nutrition/hooks/useTargets'
import { cn } from '@/lib/utils'
import type { Settings } from '@/types'

type GoalType = NonNullable<Settings['goalType']>
type Sex = NonNullable<Settings['sex']>

const GOALS: { value: GoalType; label: string; icon: string; desc: string }[] = [
  { value: 'cut',      label: 'Cut',      icon: '🔥', desc: 'Lose fat' },
  { value: 'maintain', label: 'Maintain', icon: '⚖️', desc: 'Stay lean' },
  { value: 'bulk',     label: 'Bulk',     icon: '💪', desc: 'Build muscle' },
]

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-400' }
  if (bmi < 25)   return { label: 'Normal',       color: 'text-green-400' }
  if (bmi < 30)   return { label: 'Overweight',   color: 'text-yellow-400' }
  return               { label: 'Obese',          color: 'text-red-400' }
}

function calcSuggestedTargets(weightKg: number, heightCm: number, sex: Sex, goal: GoalType) {
  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * 30 + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * 30 - 161
  const tdee = Math.round(bmr * 1.55)

  const offsets: Record<GoalType, number> = { cut: -500, maintain: 0, bulk: 300 }
  const proteinPer: Record<GoalType, number> = { cut: 2.2, maintain: 1.8, bulk: 1.6 }
  const fatPer: Record<GoalType, number> = { cut: 0.8, maintain: 1.0, bulk: 1.0 }

  const dailyKcal    = Math.round(tdee + offsets[goal])
  const dailyProtein = Math.round(proteinPer[goal] * weightKg)
  const dailyFat     = Math.round(fatPer[goal] * weightKg)
  const remainingKcal = Math.max(0, dailyKcal - dailyProtein * 4 - dailyFat * 9)
  const dailyCarbs   = Math.round(remainingKcal / 4)

  return { dailyKcal, dailyProtein, dailyCarbs, dailyFat }
}

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const { session, signOut } = useAuth()
  const { metrics } = useBodyMetrics(1)
  const { updateTargets } = useTargets()

  const latestWeight = metrics[0]?.weightKg
  const heightCm = settings?.heightCm
  const sex = settings?.sex
  const goalType = settings?.goalType

  const bmi = latestWeight && heightCm
    ? Math.round((latestWeight / Math.pow(heightCm / 100, 2)) * 10) / 10
    : null
  const bmiCategory = bmi ? getBmiCategory(bmi) : null

  async function applySuggestedTargets() {
    if (!latestWeight || !heightCm || !sex || !goalType) return
    const targets = calcSuggestedTargets(latestWeight, heightCm, sex, goalType)
    await updateTargets(targets)
    toast.success('Targets updated based on your profile')
  }

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Profile & Goals */}
      <section className="flex flex-col gap-3">
        <SectionHeader>Profile & Goals</SectionHeader>
        <Card>
          <CardContent className="p-4 flex flex-col gap-5">

            {/* Height */}
            <div className="flex flex-col gap-1.5">
              <Label>Height (cm)</Label>
              <NumberStepper
                value={String(settings?.heightCm ?? '')}
                onChange={v => void updateSettings({ heightCm: Number(v) || undefined })}
                step={1}
                min={100}
                max={250}
                inputMode="numeric"
                placeholder="175"
              />
            </div>

            {/* Sex */}
            <div className="flex flex-col gap-1.5">
              <Label>Biological sex</Label>
              <div className="flex gap-1 p-0.5 bg-muted rounded-md w-fit">
                {(['male', 'female'] as Sex[]).map(s => (
                  <button
                    key={s}
                    onClick={() => void updateSettings({ sex: s })}
                    className={cn(
                      'px-5 py-1.5 rounded text-sm font-medium transition-colors capitalize',
                      sex === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* BMI */}
            {bmi && bmiCategory && (
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                <span className="text-sm text-muted-foreground">BMI</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{bmi}</span>
                  <Badge variant="outline" className={cn('text-xs', bmiCategory.color)}>
                    {bmiCategory.label}
                  </Badge>
                </div>
              </div>
            )}

            {/* Goal selector */}
            <div className="flex flex-col gap-2">
              <Label>Goal</Label>
              <div className="grid grid-cols-3 gap-2">
                {GOALS.map(g => (
                  <button
                    key={g.value}
                    onClick={() => void updateSettings({ goalType: g.value })}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-all',
                      goalType === g.value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    <span className="text-lg">{g.icon}</span>
                    <span className="text-xs font-medium">{g.label}</span>
                    <span className="text-[10px]">{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Suggest targets button */}
            {latestWeight && heightCm && sex && goalType && (
              <Button onClick={applySuggestedTargets} variant="outline" className="gap-2">
                Apply suggested targets for {goalType}
              </Button>
            )}

            {(!latestWeight || !heightCm || !sex || !goalType) && (
              <p className="text-xs text-muted-foreground">
                {!latestWeight ? 'Log your weight in Stats → Body first.' : 'Fill in height, sex, and goal to get target suggestions.'}
              </p>
            )}

          </CardContent>
        </Card>
      </section>

      {/* Targets */}
      <section className="flex flex-col gap-3">
        <SectionHeader>Daily Targets</SectionHeader>
        <Card>
          <CardContent className="p-4">
            <TargetForm />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Label className="text-sm">Activity-driven targets</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adjusts carbs and fat based on your recent steps and workouts. Protein stays where you set it.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings?.dynamicTargetsEnabled ?? false}
                onClick={() => void updateSettings({ dynamicTargetsEnabled: !settings?.dynamicTargetsEnabled })}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  settings?.dynamicTargetsEnabled ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition-transform',
                    settings?.dynamicTargetsEnabled ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>

            {settings?.dynamicTargetsEnabled && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Rolling window</Label>
                <div className="flex gap-1 p-0.5 bg-muted rounded-md w-fit">
                  {[3, 5, 7].map(n => (
                    <button
                      key={n}
                      onClick={() => void updateSettings({ activityWindowDays: n })}
                      className={cn(
                        'px-3 py-1 rounded text-xs font-medium transition-colors',
                        (settings.activityWindowDays ?? 7) === n
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground'
                      )}
                    >
                      {n} days
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Workout preferences */}
      <section className="flex flex-col gap-3">
        <SectionHeader>Workout</SectionHeader>
        <Card>
          <CardContent className="p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Rest timer (seconds)</Label>
              <NumberStepper
                value={String(settings?.defaultRestSeconds ?? 90)}
                onChange={v => void updateSettings({ defaultRestSeconds: Number(v) })}
                step={15}
                min={10}
                max={600}
                inputMode="numeric"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Barbell weight (kg)</Label>
              <NumberStepper
                value={String(settings?.barWeightKg ?? 20)}
                onChange={v => void updateSettings({ barWeightKg: Number(v) })}
                step={1}
                min={0}
                inputMode="decimal"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Data */}
      <section className="flex flex-col gap-3">
        <SectionHeader>Data</SectionHeader>
        <Card>
          <CardContent className="p-4 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              All data is stored on your device. Export regularly to back up.
            </p>
            <div className="flex gap-2">
              <ExportButton />
              <ImportButton />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Account */}
      {session && (
        <section className="flex flex-col gap-3">
          <SectionHeader>Account</SectionHeader>
          <Card>
            <CardContent className="p-4 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
              <Button
                variant="outline"
                className="gap-2 w-fit"
                onClick={() => void signOut()}
              >
                <LogOut size={16} />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <p className="text-xs text-muted-foreground text-center">Solo Leveling v0.1.0</p>
    </div>
  )
}
