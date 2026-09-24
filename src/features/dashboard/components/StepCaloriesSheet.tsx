import { format, parseISO } from 'date-fns'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatKcal } from '@/lib/format'
import { AVERAGE_BODY_KG, NET_KCAL_PER_KG_KM, type StepBurn } from '@/lib/stepCalories'

interface Props {
  open: boolean
  onClose: () => void
  eaten: number
  burn: StepBurn
  target: number
}

/** How the day's step calories were worked out, and what they come off. */
export default function StepCaloriesSheet({ open, onClose, eaten, burn, target }: Props) {
  const rows = [
    { label: 'Eaten', value: `${formatKcal(eaten)} kcal` },
    { label: `${burn.steps.toLocaleString()} steps · ${burn.km.toFixed(1)} km`, value: `−${formatKcal(burn.kcal)} kcal` },
  ]

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="px-4">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="text-xl">Calories from steps</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-2 rounded-2xl bg-secondary p-4 text-sm tabular-nums">
          {rows.map(r => (
            <div key={r.label} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{r.label}</span>
              <span>{r.value}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between gap-3 border-t border-white/10 pt-3 font-semibold">
            <span>Net</span>
            <span>{formatKcal(eaten - burn.kcal)} / {formatKcal(target)} kcal</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Walking burns about {NET_KCAL_PER_KG_KM} kcal per kg of body weight per km on top of what you burn at rest,
            which your target already covers.
          </p>
          <p>
            {burn.weightDate
              ? `Body weight: ${burn.weightKg} kg (weigh-in ${format(parseISO(burn.weightDate), 'd MMM')}).`
              : `Body weight: ${AVERAGE_BODY_KG} kg, an average adult. Log your weight for your own number.`}{' '}
            {burn.averageHeight
              ? `Step length ${(burn.km * 1000 / burn.steps).toFixed(2)} m from an average height; set yours in Profile.`
              : `Step length ${(burn.km * 1000 / burn.steps).toFixed(2)} m from your height (${burn.heightCm} cm).`}
          </p>
          <p>Carbs and fat targets grow by the same amount; protein stays. Workouts aren’t subtracted, since there’s no reliable way to measure them.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
