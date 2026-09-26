import { cn } from '@/lib/utils'

// Same geometry as scripts/generate-icons.mjs and public/favicon.svg (100-unit artboard).
const chevron = (y: number) => `M50,${y} L80,${y + 30} L67,${y + 30} L50,${y + 13} L33,${y + 30} L20,${y + 30} Z`

interface Props {
  size?: number
  className?: string
}

/** The Solo Leveling mark ("Ascent"): three stacked chevrons, the top one in the theme accent. */
export default function Logo({ size = 48, className }: Props) {
  return (
    <svg viewBox="14 12 72 72" width={size} height={size} className={cn('shrink-0', className)} aria-hidden="true">
      <path d={chevron(12)} fill="hsl(var(--primary))" />
      <path d={`${chevron(33)} ${chevron(54)}`} fill="currentColor" />
    </svg>
  )
}
