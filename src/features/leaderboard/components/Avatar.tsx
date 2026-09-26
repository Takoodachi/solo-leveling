import { cn } from '@/lib/utils'
import { safeAvatar } from '@/features/settings/avatar'
import { initials } from '../boards'

interface Props {
  name: string
  /** The friend's profile photo from their snapshot (checked before drawing). */
  src?: string
  me?: boolean
  size?: number
  className?: string
}

/** A friend's photo, else their initials; your own avatar is ringed in the accent colour. */
export default function Avatar({ name, src, me = false, size = 40, className }: Props) {
  const photo = safeAvatar(src)
  const classes = cn('flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold', me && 'ring-2 ring-primary', className)
  if (photo) return <img src={photo} alt="" className={cn(classes, 'object-cover')} style={{ width: size, height: size }} />
  return (
    <span className={classes} style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
