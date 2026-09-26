import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { safeAvatar } from '@/features/settings/avatar'

interface Props {
  name: string
  /** Profile photo (data URL); initials when absent. */
  src?: string
  size?: number
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ name, src, size = 56, className }: Props) {
  const photo = safeAvatar(src)
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        className={cn('shrink-0 rounded-full object-cover shadow-lg shadow-primary/20', className)}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className={cn('bg-brand-gradient flex shrink-0 items-center justify-center rounded-full font-heading font-bold text-primary-foreground shadow-lg shadow-primary/20', className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {name.trim() ? initials(name) : <UserRound size={size * 0.45} strokeWidth={2.2} />}
    </div>
  )
}
