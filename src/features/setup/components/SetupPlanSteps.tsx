import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WEEKDAY_SHORT, WEEK_ORDER } from '@/features/workouts/categories'
import { cn } from '@/lib/utils'
import { STARTER_PLANS } from '../plans'
import { fieldsOf, setupTargets, typedTargets, type TargetFields } from '../setup'
import { lead, title, type StepProps } from './SetupSteps'

const choice = (on: boolean) =>
  cn('flex min-h-14 w-full flex-col justify-center rounded-2xl px-4 py-3 text-left transition-colors', on ? 'bg-foreground text-background' : 'bg-card')

/** Whether they follow a plan already; if not, one made from the templates, on the days they pick. */
export function PlanStep({ form, onChange }: StepProps) {
  const toggleDay = (d: number) => onChange({ days: form.days.includes(d) ? form.days.filter(x => x !== d) : [...form.days, d] })
  return (
    <>
      <h1 className={title}>Your workout plan</h1>
      <p className={lead}>Following a plan already? Add it in Workouts once you’re in. If not, start from one of ours: it’s yours to change.</p>
      <div className="mt-6 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Workout plan">
        {(['own', 'starter'] as const).map(p => (
          <button key={p} type="button" role="radio" aria-checked={form.plan === p} onClick={() => onChange({ plan: p })} className={choice(form.plan === p)}>
            <span className="font-semibold">{p === 'own' ? 'I have one' : 'Give me one'}</span>
          </button>
        ))}
      </div>
      {form.plan === 'starter' && (
        <>
          <div className="mt-5 flex flex-col gap-2" role="radiogroup" aria-label="Starter plan">
            {STARTER_PLANS.map(p => (
              <button key={p.id} type="button" role="radio" aria-checked={form.starter === p.id} onClick={() => onChange({ starter: p.id })} className={choice(form.starter === p.id)}>
                <span className="font-semibold">{p.name}</span>
                <span className={cn('text-sm', form.starter === p.id ? 'text-background/75' : 'text-muted-foreground')}>{p.hint}</span>
              </button>
            ))}
          </div>
          <Label className="mt-5 block">Train on</Label>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {WEEK_ORDER.map(d => (
              <button
                key={d}
                type="button"
                aria-pressed={form.days.includes(d)}
                onClick={() => toggleDay(d)}
                className={cn('h-11 rounded-2xl text-sm font-semibold', form.days.includes(d) ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground')}
              >
                {WEEKDAY_SHORT[d].slice(0, 2)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {form.days.length === 0 ? 'Pick at least one day.' : `${form.days.length} day${form.days.length === 1 ? '' : 's'} a week. Your Home shows each day’s workout.`}
          </p>
        </>
      )}
    </>
  )
}

const FIELDS: { key: keyof TargetFields; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
]

/** Daily calories and macros: suggested from the body and goal screens, each one theirs to change. Only for someone tracking food. */
export function TargetsStep({ form, onChange }: StepProps) {
  const suggested = setupTargets(form)
  const shown = form.targets ?? (suggested ? fieldsOf(suggested) : { kcal: '', protein: '', carbs: '', fat: '' })
  const differs = suggested && JSON.stringify(fieldsOf(suggested)) !== JSON.stringify(shown)
  const valid = typedTargets({ ...form, targets: shown }) != null || Object.values(shown).every(v => v === '')
  return (
    <>
      <h1 className={title}>Your daily targets</h1>
      <p className={lead}>
        {suggested ? 'Worked out from your body and your goal. Change any of them if you know your own.' : 'With your sex, height and weight we’d suggest these. Type your own, or leave them for later.'}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {FIELDS.map(f => (
          <div key={f.key} className={cn('flex flex-col gap-2', f.key === 'kcal' && 'col-span-2')}>
            <Label htmlFor={`setup-${f.key}`}>{f.label} ({f.unit})</Label>
            <Input id={`setup-${f.key}`} inputMode="numeric" value={shown[f.key]} onChange={e => onChange({ targets: { ...shown, [f.key]: e.target.value } })} />
          </div>
        ))}
      </div>
      {!valid && <p className="mt-2 text-xs text-destructive">Fill in all four with numbers to use your own.</p>}
      {differs && (
        <button type="button" onClick={() => onChange({ targets: null })} className="mt-3 h-11 text-sm font-semibold text-primary">
          Use the suggested ones ({suggested.dailyKcal.toLocaleString()} kcal)
        </button>
      )}
      <p className="mt-4 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground">Walking is counted on top, day by day. Change these any time in Profile → Daily targets.</p>
    </>
  )
}
