import { useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Segmented from '@/components/Segmented'
import { useMacroAdherence } from '@/features/analytics/hooks/useAnalyticsData'
import MacroAdherenceChart from '@/features/analytics/components/MacroAdherenceChart'
import ChartCard from '@/features/analytics/components/ChartCard'
import { WeeklyVolumeCard, OneRmCard } from '@/features/analytics/components/TrainingCharts'
import { WeightTrendCard, StepsCard } from '@/features/analytics/components/BodyCharts'
import SetVolumeCard from '@/features/analytics/components/SetVolumeCard'

type MacroView = 'week' | 'month'

export default function AnalyticsPage() {
  const [macroView, setMacroView] = useState<MacroView>('week')
  const macro = useMacroAdherence(macroView === 'week' ? 7 : 30)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Analytics" />

      <SetVolumeCard />
      <WeeklyVolumeCard />
      <OneRmCard />

      <ChartCard
        title="Macro adherence"
        subtitle={`Stacked kcal vs. today’s target (${macro.targetKcal} kcal)`}
        action={
          <Segmented
            size="sm"
            value={macroView}
            onChange={setMacroView}
            options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
            className="w-36 shrink-0 bg-secondary"
          />
        }
      >
        {macro.hasData ? (
          <MacroAdherenceChart data={macro.rows} targetKcal={macro.targetKcal} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No food logs in the last {macroView === 'week' ? '7' : '30'} days.
          </p>
        )}
      </ChartCard>

      <WeightTrendCard />
      <StepsCard />
    </div>
  )
}
