import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { LEVEL_GUIDE, STATUS, VOLUME_MUSCLES, formatRange } from '../volume'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const th = 'pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'
const td = 'py-2 text-right tabular-nums text-muted-foreground'
const tdMav = 'py-2 text-right font-semibold tabular-nums text-primary'

/** "i" sheet: what MEV / MAV / MRV mean and the weekly set ranges behind the radar. */
export default function VolumeGuidelinesSheet({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-5">
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl">Volume guidelines</SheetTitle>
          <SheetDescription className="text-[15px] leading-relaxed">
            Research-based weekly set ranges per muscle group for muscle growth.
          </SheetDescription>
        </SheetHeader>

        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div><dt className="inline font-semibold">MEV</dt> <dd className="inline text-muted-foreground">= Minimum Effective Volume: the fewest sets that still make progress.</dd></div>
          <div><dt className="inline font-semibold">MAV</dt> <dd className="inline text-muted-foreground">= Maximum Adaptive Volume: the sweet spot for growth.</dd></div>
          <div><dt className="inline font-semibold">MRV</dt> <dd className="inline text-muted-foreground">= Maximum Recoverable Volume: the ceiling you can still recover from.</dd></div>
        </dl>

        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS.below.color }} /> Below MEV: under the minimum</li>
          <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS.growing.color }} /> Growing: MEV up to MAV</li>
          <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS.sweet.color }} /> Sweet spot: within MAV</li>
          <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS.over.color }} /> Overreaching: above MAV</li>
        </ul>

        <h3 className="eyebrow mt-6 text-primary">By training level (sets / week)</h3>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr><th className={`${th} text-left`} /><th className={th}>MEV</th><th className={th}>MAV</th><th className={th}>MRV</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {LEVEL_GUIDE.map(l => (
              <tr key={l.label}><td className="py-2">{l.label}</td><td className={td}>{l.mev}</td><td className={tdMav}>{l.mav}</td><td className={td}>{l.mrv}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-muted-foreground">Beginner: under 1 year of training. Intermediate: 1–3 years. Advanced: 3+ years.</p>

        <h3 className="eyebrow mt-6 text-primary">By muscle group (intermediate)</h3>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr><th className={`${th} text-left`} /><th className={th}>MEV</th><th className={th}>MAV</th><th className={th}>MRV</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {VOLUME_MUSCLES.map(m => (
              <tr key={m.key}>
                <td className="py-2">{m.label}{m.estimate && <span className="text-muted-foreground">*</span>}</td>
                <td className={td}>{formatRange(m.mev)}</td>
                <td className={tdMav}>{formatRange(m.mav)}</td>
                <td className={td}>{m.mrv}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-col gap-1.5 text-xs italic text-muted-foreground">
          <p>Based on Renaissance Periodization volume landmarks (Israetel et al.). * Not in RP’s tables, so these are conservative estimates.</p>
          <p>The radar scales these by level (beginner ×0.75, advanced ×1.25). A set counts fully for its target muscles and half for the muscles that assist (front delts from pressing don’t count toward shoulders). Ranges vary between people, so use them as a guide.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
