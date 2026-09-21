import type { RoutineCategory } from '@/types'
import { cn } from '@/lib/utils'
import { CATEGORY_META } from '../categories'

interface Props {
  category: RoutineCategory
  className?: string
  /** Darken from the left so overlaid text stays readable. */
  fade?: 'left' | 'bottom'
}

/**
 * Decorative stand-in for the photos in the design: a warm category-tinted glow
 * with a large ghosted icon. Purely presentational (aria-hidden).
 */
export default function RoutineArt({ category, className, fade = 'left' }: Props) {
  const { Icon, hue } = CATEGORY_META[category]
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 85% 20%, hsl(${hue} 90% 45% / 0.55), transparent 60%),
                       radial-gradient(80% 80% at 100% 100%, hsl(${hue + 12} 80% 30% / 0.5), transparent 70%),
                       linear-gradient(135deg, hsl(240 5% 8%), hsl(${hue} 30% 12%))`,
        }}
      />
      <Icon
        className="absolute -right-6 top-1/2 h-40 w-40 -translate-y-1/2 rotate-[-18deg] text-white/[0.08]"
        strokeWidth={1.2}
      />
      <div
        className={cn(
          'absolute inset-0',
          fade === 'left'
            ? 'bg-gradient-to-r from-black/85 via-black/45 to-transparent'
            : 'bg-gradient-to-t from-background via-background/40 to-transparent',
        )}
      />
    </div>
  )
}
