import type { ReactNode } from 'react'

interface Props {
  /** Anchor for search links (/analytics#id). */
  id?: string
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export default function ChartCard({ id, title, subtitle, action, children }: Props) {
  return (
    <section id={id} className="rounded-3xl bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
