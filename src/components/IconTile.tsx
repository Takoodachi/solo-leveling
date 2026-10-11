import type { LucideIcon } from 'lucide-react'

interface Props {
  Icon: LucideIcon
  value: string
  label: string
  /** A second, smaller line under the label. */
  note?: string | null
}

/** A figure with its icon above it (Home's weekly stats, the recap). */
export default function IconTile({ Icon, value, label, note }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><Icon size={18} /></span>
      <div>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  )
}
