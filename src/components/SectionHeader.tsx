import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  action?: ReactNode
}

export default function SectionHeader({ children, action }: Props) {
  return (
    <div className="flex items-center justify-between mb-1">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {children}
      </h2>
      {action}
    </div>
  )
}
