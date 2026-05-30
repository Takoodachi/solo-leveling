import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { useBodyMetrics } from './useBodyMetrics'
import { today, formatShortDate } from '@/lib/date'

export default function WeightLogPage() {
  const navigate = useNavigate()
  const { metrics, logWeight, deleteMetric } = useBodyMetrics(90)
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(today())
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const kg = Number(weight)
    if (!kg || kg <= 0 || kg > 500) return
    setSaving(true)
    await logWeight(date, kg)
    setSaving(false)
    setWeight('')
  }

  // Chart data sorted ascending for the line
  const chartData = [...metrics]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => ({ date: formatShortDate(m.date), weight: m.weightKg }))

  const latest = metrics[0]

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-xl font-bold">Body Weight</h1>
      </div>

      {latest && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Latest</p>
            <p className="text-3xl font-bold">{latest.weightKg} <span className="text-lg font-normal text-muted-foreground">kg</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatShortDate(latest.date)}</p>
          </CardContent>
        </Card>
      )}

      {/* Log weight */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3">
          <h2 className="font-medium text-sm">Log weight</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="70.5"
                value={weight}
                onChange={e => setWeight(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !weight} className="gap-2">
            <Plus size={16} />
            Save
          </Button>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-medium text-sm mb-3">90-day trend</h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  width={36}
                />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* History list */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">History</h2>
        {metrics.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No entries yet</p>
        )}
        {metrics.map(m => (
          <div key={m.uuid} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm">{formatShortDate(m.date)}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{m.weightKg} kg</span>
              <button
                onClick={() => deleteMetric(m.uuid)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete entry"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
