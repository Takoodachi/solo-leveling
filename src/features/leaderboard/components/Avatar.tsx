import { cn } from '@/lib/utils'
import { initials } from '../boards'

/** Initials in a circle; your own avatar is ringed in the accent colour. */
export default function Avatar({ name, me = false, size = 40, className }: { name: string; me?: boolean; size?: number; className?: string }) {
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold', me && 'ring-2 ring-primary', className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
