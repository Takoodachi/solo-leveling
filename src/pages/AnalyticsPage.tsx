import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useMacroAdherence } from '@/features/analytics/hooks/useAnalyticsData'
import MacroAdherenceChart from '@/features/analytics/components/MacroAdherenceChart'
import { cn } from '@/lib/utils'

type MacroView = 'week' | 'month'

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [macroView, setMacroView] = useState<MacroView>('week')

  const macro = useMacroAdherence(macroView === 'week' ? 7 : 30)

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-xl font-bold">Analytics</h1>
      </div>

      {/* Macro Adherence */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-medium text-sm">Macro adherence</h2>
              <p className="text-xs text-muted-foreground">
                Stacked kcal by macro vs. current target ({macro.targetKcal} kcal)
              </p>
            </div>
            <div className="flex gap-1 p-0.5 bg-muted rounded-md shrink-0">
              {(['week', 'month'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMacroView(v)}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors capitalize',
                    macroView === v
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          {macro.hasData ? (
            <MacroAdherenceChart data={macro.rows} targetKcal={macro.targetKcal} />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              No food logs in the last {macroView === 'week' ? '7' : '30'} days.
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Target line uses your current effective target. Past days are compared to today's goal.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
