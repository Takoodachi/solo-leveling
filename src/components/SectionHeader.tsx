import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
  /** Right-aligned orange link, e.g. "View all". */
  actionLabel?: string
  to?: string
  onAction?: () => void
  action?: ReactNode
}

export default function SectionHeader({ children, actionLabel, to, onAction, action }: Props) {
  const linkClass = 'eyebrow -mr-2 rounded-full px-2 py-2 text-primary hover:text-primary/80'
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">{children}</h2>
      {action}
      {actionLabel && to && <Link to={to} className={linkClass}>{actionLabel}</Link>}
      {actionLabel && !to && onAction && (
        <button type="button" onClick={onAction} className={linkClass}>{actionLabel}</button>
      )}
    </div>
  )
}
