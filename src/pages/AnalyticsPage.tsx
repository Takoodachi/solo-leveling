import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import { useIsNavTab } from '@/hooks/useNavTabs'
import { usePageTab } from '@/hooks/usePageTab'
import Segmented from '@/components/Segmented'
import { useMacroAdherence } from '@/features/analytics/hooks/useAnalyticsData'
import MacroAdherenceChart from '@/features/analytics/components/MacroAdherenceChart'
import ChartCard from '@/features/analytics/components/ChartCard'
import { WeeklyVolumeCard, OneRmCard } from '@/features/analytics/components/TrainingCharts'
import { WeightTrendCard, StepsCard } from '@/features/analytics/components/BodyCharts'
import SetVolumeCard from '@/features/analytics/components/SetVolumeCard'

type MacroView = 'week' | 'month'

// One long page became three shorter ones. A section's id says which tab it's on, so links to
// a section (search results) still land on it.
const TABS = [
  { value: 'muscles', label: 'Muscles' },
  { value: 'strength', label: 'Strength' },
  { value: 'food', label: 'Food & body' },
] as const
type Tab = typeof TABS[number]['value']
const SECTION_TAB: Record<string, Tab> = {
  'set-volume': 'muscles',
  'training-volume': 'strength',
  'strength-progress': 'strength',
  'macro-adherence': 'food',
  'body-weight': 'food',
  steps: 'food',
}

function MacroAdherenceCard() {
  const [view, setView] = useState<MacroView>('week')
  const macro = useMacroAdherence(view === 'week' ? 7 : 30)

  return (
    <ChartCard
      id="macro-adherence"
      title="Macro adherence"
      subtitle={`Stacked kcal eaten vs. your target (${macro.targetKcal} kcal)`}
      action={
        <Segmented
          size="sm"
          value={view}
          onChange={setView}
          options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
          className="w-36 shrink-0 bg-secondary"
        />
      }
    >
      {macro.hasData ? (
        <MacroAdherenceChart data={macro.rows} targetKcal={macro.targetKcal} />
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No food logs in the last {view === 'week' ? '7' : '30'} days.
        </p>
      )}
    </ChartCard>
  )
}

export default function AnalyticsPage() {
  const isTab = useIsNavTab('/analytics')
  const [params] = useSearchParams()
  // `?lift=` picks a lift on the strength chart
  const [tab, setTab] = usePageTab('analytics', TABS.map(t => t.value), SECTION_TAB, params.has('lift') ? 'strength' : undefined)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader back={isTab ? undefined : '/home'} title="Analytics" />
      <Segmented value={tab} onChange={setTab} options={TABS} />

      <div key={tab} className="flex animate-fade-in flex-col gap-4">
        {tab === 'muscles' && <SetVolumeCard />}
        {tab === 'strength' && (
          <>
            <WeeklyVolumeCard />
            <OneRmCard />
          </>
        )}
        {tab === 'food' && (
          <>
            <MacroAdherenceCard />
            <WeightTrendCard />
            <StepsCard />
          </>
        )}
      </div>
    </div>
  )
}
