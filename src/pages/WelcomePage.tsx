import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BodyStep, GoalStep, NameStep, ThemeStep, TrackStep } from '@/features/setup/components/SetupSteps'
import { PlanStep, TargetsStep } from '@/features/setup/components/SetupPlanSteps'
import { repaintSavedTheme } from '@/features/settings/hooks/useTheme'
import { EMPTY_SETUP, finishSetup, savedSetup, type SetupForm } from '@/features/setup/setup'

/**
 * The setup questions: you, your body, your goal, your workout plan, what to track, your daily
 * targets (only when food is tracked) and the look. Shown once to an account that has never saved
 * a setting, right after its first sign-in, instead of the routes while `useNeedsSetup` says so;
 * every question can be left empty and the whole thing skipped, and either way it doesn't come
 * back. `redo` (/setup, from Settings) asks them again, filled in with what's saved.
 */
export default function WelcomePage({ redo = false }: { redo?: boolean }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<SetupForm | null>(redo ? null : EMPTY_SETUP)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (redo) void savedSetup().then(setForm)
  }, [redo])

  if (!form) return <div className="min-h-dvh bg-page" />
  const steps = [NameStep, BodyStep, GoalStep, PlanStep, TrackStep, ...(form.track.includes('food') ? [TargetsStep] : []), ThemeStep]
  const Step = steps[Math.min(step, steps.length - 1)]
  const last = step >= steps.length - 1
  const noDays = Step === PlanStep && form.plan === 'starter' && form.days.length === 0

  async function finish(filled: boolean) {
    setSaving(true)
    // First run: the screen goes away by itself once the settings are saved
    await finishSetup(filled ? form : null, redo).catch(() => setSaving(false))
    // Left with a theme being tried on: back to the one that's saved
    if (!filled) void repaintSavedTheme()
    if (redo) navigate('/home', { replace: true })
  }

  function cancel() {
    void repaintSavedTheme()
    navigate(-1)
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-page pt-safe pl-safe pr-safe">
      <form
        className="mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-md flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
        onSubmit={e => {
          e.preventDefault()
          if (last) void finish(true)
          else setStep(step + 1)
        }}
      >
        <div className="flex h-14 items-center justify-between">
          <div className="flex gap-1.5" role="img" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((_, i) => (
              <span key={i} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-primary' : 'w-1.5 bg-foreground/20')} />
            ))}
          </div>
          <button type="button" onClick={() => (redo ? cancel() : void finish(false))} disabled={saving} className="-mr-2 h-11 px-2 text-sm font-semibold text-muted-foreground">
            {redo ? 'Cancel' : 'Skip setup'}
          </button>
        </div>

        <div className="flex-1 pt-6">
          <Step form={form} onChange={patch => setForm(f => (f ? { ...f, ...patch } : f))} />
        </div>

        <div className="flex gap-2 pt-8">
          {step > 0 && (
            <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => setStep(step - 1)} disabled={saving}>Back</Button>
          )}
          <Button type="submit" size="lg" className="flex-[2]" disabled={saving || noDays}>{last ? (redo ? 'Save' : 'Start') : 'Continue'}</Button>
        </div>
      </form>
    </div>
  )
}
