import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BodyStep, GoalStep, NameStep, ThemeStep, TrackStep } from '@/features/setup/components/SetupSteps'
import { repaintSavedTheme } from '@/features/settings/hooks/useTheme'
import { EMPTY_SETUP, finishSetup, type SetupForm } from '@/features/setup/setup'

const STEPS = [NameStep, BodyStep, GoalStep, TrackStep, ThemeStep]

/**
 * First run: five short screens (you, your body, your goal, what to track, the look) shown once
 * to an account that has never saved a setting, right after its first sign-in. Every question can be left empty and the whole thing skipped; either way it
 * doesn't come back. The app shows instead of the routes while `useNeedsSetup` says so.
 */
export default function WelcomePage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<SetupForm>(EMPTY_SETUP)
  const [saving, setSaving] = useState(false)
  const Step = STEPS[step]
  const last = step === STEPS.length - 1

  async function finish(filled: boolean) {
    setSaving(true)
    // The screen goes away by itself once the settings are saved
    await finishSetup(filled ? form : null).catch(() => setSaving(false))
    // Skipped with a theme being tried on: back to the one that's saved
    if (!filled) void repaintSavedTheme()
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
          <div className="flex gap-1.5" role="img" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span key={i} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-primary' : 'w-1.5 bg-foreground/20')} />
            ))}
          </div>
          <button type="button" onClick={() => void finish(false)} disabled={saving} className="-mr-2 h-11 px-2 text-sm font-semibold text-muted-foreground">
            Skip setup
          </button>
        </div>

        <div className="flex-1 pt-6">
          <Step form={form} onChange={patch => setForm(f => ({ ...f, ...patch }))} />
        </div>

        <div className="flex gap-2 pt-8">
          {step > 0 && (
            <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => setStep(step - 1)} disabled={saving}>Back</Button>
          )}
          <Button type="submit" size="lg" className="flex-[2]" disabled={saving}>{last ? 'Start' : 'Continue'}</Button>
        </div>
      </form>
    </div>
  )
}
