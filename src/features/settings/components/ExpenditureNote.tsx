import { EXPENDITURE_NEEDS, type Expenditure } from '@/features/nutrition/expenditure'

interface Props {
  /** What the logs say is burned; undefined while it loads. */
  measured: Expenditure | undefined
  /** False when the logs come to less than a resting body burns: the suggestion then uses the formula. */
  believable: boolean
}

const kcal = (n: number) => `${n.toLocaleString()} kcal`
const weekly = (kg: number) => (Math.abs(kg) < 0.05 ? 'held steady' : `moved ${kg > 0 ? '+' : '−'}${Math.abs(kg).toFixed(1)} kg a week`)

/** Under the goal: where the suggested targets come from, the logs or the formula, in plain numbers. */
export default function ExpenditureNote({ measured, believable }: Props) {
  if (!measured) return null
  const box = 'rounded-2xl bg-secondary px-4 py-3 text-xs leading-relaxed text-muted-foreground'

  if (!measured.ready) {
    const { foodDays, weighIns } = measured
    return (
      <p className={box}>
        <span className="font-semibold text-foreground">From a formula for now.</span> After two weeks of food and weight logs, the
        suggestion uses what you really burn. So far in the last {EXPENDITURE_NEEDS.windowDays} days: {Math.min(foodDays, EXPENDITURE_NEEDS.foodDays)} of{' '}
        {EXPENDITURE_NEEDS.foodDays} days of food, {Math.min(weighIns, EXPENDITURE_NEEDS.weighIns)} of {EXPENDITURE_NEEDS.weighIns} weigh-ins.
      </p>
    )
  }

  if (!believable) {
    return (
      <p className={box}>
        <span className="font-semibold text-foreground">From a formula.</span> Your logs come to {kcal(measured.kcal)} a day, less than a
        body burns at rest, so some food probably wasn’t logged. The suggestion leaves them out.
      </p>
    )
  }

  return (
    <p className={box}>
      <span className="font-semibold text-foreground">From your logs: about {kcal(measured.kcal)} a day.</span>{' '}
      Over the last {EXPENDITURE_NEEDS.windowDays} days you ate about {kcal(measured.eaten)} a day and your weight {weekly(measured.kgPerWeek)}
      {measured.walked > 0 && <>; {kcal(measured.walked)} of it is walking, which is counted day by day</>}.
    </p>
  )
}
