import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Logo from '@/components/Logo'
import NumberStepper from '@/components/NumberStepper'
import Segmented from '@/components/Segmented'
import { cn } from '@/lib/utils'
import type { GoalType } from '@/features/settings/targetSuggestion'
import AvatarPicker from '@/features/settings/components/AvatarPicker'
import { Swatch } from '@/features/settings/components/ThemePicker'
import { THEMES } from '@/features/settings/themes'
import { paintTheme, useActiveTheme } from '@/features/settings/hooks/useTheme'
import { homeWidgetDef } from '@/features/dashboard/homeWidgets'
import { TRACKABLE, setupTargets, type SetupForm } from '../setup'

interface StepProps {
  form: SetupForm
  onChange: (patch: Partial<SetupForm>) => void
}

const title = 'font-heading text-2xl font-bold'
const lead = 'mt-2 text-sm leading-relaxed text-muted-foreground'

export function NameStep({ form, onChange }: StepProps) {
  return (
    <>
      <Logo size={56} className="mb-6" />
      <h1 className={title}>Welcome to Solo Leveling</h1>
      <p className={lead}>
        A few short questions, so the app fits you from the start. Skip any of them: everything can be changed later in Profile and Settings.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <AvatarPicker name={form.name} src={form.avatar} size={72} onPick={avatar => onChange({ avatar })} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor="setup-name">What should we call you?</Label>
          <Input id="setup-name" value={form.name} onChange={e => onChange({ name: e.target.value })} placeholder="Your name" autoComplete="given-name" maxLength={40} enterKeyHint="next" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Tap the circle to add a photo. Friends on the leaderboard see your name and photo.</p>
    </>
  )
}

export function BodyStep({ form, onChange }: StepProps) {
  return (
    <>
      <h1 className={title}>About you</h1>
      <p className={lead}>Strength ranks compare your lifts with people of your sex and bodyweight, and calorie estimates start from your size. Nobody else sees these.</p>
      <div className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label>Biological sex</Label>
          <Segmented
            value={form.sex ?? ('' as 'male')}
            options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
            onChange={sex => onChange({ sex })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="setup-height">Height (cm)</Label>
            <Input id="setup-height" inputMode="decimal" value={form.heightCm} onChange={e => onChange({ heightCm: e.target.value })} placeholder="175" enterKeyHint="next" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="setup-weight">Weight (kg)</Label>
            <Input id="setup-weight" inputMode="decimal" value={form.weightKg} onChange={e => onChange({ weightKg: e.target.value })} placeholder="70" enterKeyHint="done" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="setup-since">When did you start lifting? (roughly)</Label>
          <Input id="setup-since" type="date" value={form.trainingSince} onChange={e => onChange({ trainingSince: e.target.value })} />
          <p className="text-xs text-muted-foreground">New to it or years in: it sets how many sets a week Analytics aims you at.</p>
        </div>
      </div>
    </>
  )
}

const GOALS: { value: GoalType; label: string; hint: string }[] = [
  { value: 'maintain', label: 'Maintain', hint: 'Stay around the weight I am' },
  { value: 'bulk', label: 'Bulk', hint: 'Gain, to build muscle' },
  { value: 'cut', label: 'Cut', hint: 'Lose slowly, keeping muscle' },
]

export function GoalStep({ form, onChange }: StepProps) {
  const targets = setupTargets(form)
  return (
    <>
      <h1 className={title}>Your goal</h1>
      <p className={lead}>It sets where your calorie and protein targets start. Change it whenever your plans do.</p>
      <div className="mt-6 flex flex-col gap-2" role="radiogroup" aria-label="Goal">
        {GOALS.map(g => (
          <button
            key={g.value}
            type="button"
            role="radio"
            aria-checked={form.goal === g.value}
            onClick={() => onChange({ goal: g.value })}
            className={cn('flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors', form.goal === g.value ? 'bg-foreground text-background' : 'bg-card')}
          >
            <span className="font-semibold">{g.label}</span>
            <span className={cn('text-sm', form.goal === g.value ? 'text-background/75' : 'text-muted-foreground')}>{g.hint}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <Label>Workouts a week you’re aiming for</Label>
        <NumberStepper value={String(form.workoutsPerWeek)} min={1} max={7} step={1} inputMode="numeric" onChange={v => onChange({ workoutsPerWeek: Math.max(1, Math.min(7, Math.round(Number(v) || 3))) })} />
      </div>
      <p className="mt-6 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground">
        {targets ? (
          <>
            Your daily targets will start at{' '}
            <span className="font-semibold text-foreground">{targets.dailyKcal.toLocaleString()} kcal and {targets.dailyProtein} g of protein</span>.
            Walking is counted on top, day by day.
          </>
        ) : (
          'Targets start at 2,000 kcal and 150 g of protein. With your sex, height and weight they can be fitted to you (Profile → Body & goals).'
        )}
      </p>
    </>
  )
}

/** What to keep track of: each choice is a card on Home. Steps, calories and water start chosen. */
export function TrackStep({ form, onChange }: StepProps) {
  const toggle = (id: (typeof TRACKABLE)[number]) =>
    onChange({ track: form.track.includes(id) ? form.track.filter(t => t !== id) : [...form.track, id] })
  return (
    <>
      <h1 className={title}>What do you want to track?</h1>
      <p className={lead}>Each one gets a card on your Home screen. The usual three are already picked: add or drop any, now or later (Home → Customize).</p>
      <div className="mt-6 flex flex-col gap-2">
        {TRACKABLE.map(id => {
          const def = homeWidgetDef(id)
          if (!def) return null
          const on = form.track.includes(id)
          return (
            <button
              key={id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(id)}
              className={cn('flex min-h-16 items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors', on ? 'bg-card ring-2 ring-primary' : 'bg-card/50')}
            >
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                <def.icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{def.label}</span>
                <span className="block truncate text-sm text-muted-foreground">{def.description}</span>
              </span>
              <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border-2', on ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/25 text-transparent')}>
                <Check size={14} strokeWidth={3} />
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/** The look: picking a theme paints it at once, as a preview; it's saved with the rest at the end. */
export function ThemeStep({ form, onChange }: StepProps) {
  const active = useActiveTheme().id
  function pick(id: string) {
    paintTheme(id, undefined, false)
    onChange({ theme: id })
  }
  return (
    <>
      <h1 className={title}>Pick a look</h1>
      <p className={lead}>The whole app changes as you tap. There are more ways to make it yours in Settings → Theme.</p>
      {(['dark', 'light'] as const).map(mode => (
        <div key={mode} className="mt-5 flex flex-col gap-2">
          <p className="eyebrow px-1 text-muted-foreground">{mode === 'dark' ? 'Dark' : 'Light'}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {THEMES.filter(t => t.mode === mode).map(t => (
              <Swatch key={t.id} theme={t} active={t.id === (form.theme ?? active)} onPick={() => pick(t.id)} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
