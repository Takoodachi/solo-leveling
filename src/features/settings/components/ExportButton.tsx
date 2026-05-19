import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { db } from '@/db'
import { format } from 'date-fns'

export default function ExportButton() {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const [exercises, workouts, workoutSets, foods, foodLog, bodyMetrics, userStats, targets, achievements, prRecords, settings] =
        await Promise.all([
          db.exercises.toArray(),
          db.workouts.toArray(),
          db.workoutSets.toArray(),
          db.foods.toArray(),
          db.foodLog.toArray(),
          db.bodyMetrics.toArray(),
          db.userStats.toArray(),
          db.targets.toArray(),
          db.achievements.toArray(),
          db.prRecords.toArray(),
          db.settings.toArray(),
        ])

      const data = {
        version: 1,
        exportedAt: Date.now(),
        exercises, workouts, workoutSets, foods, foodLog, bodyMetrics,
        userStats, targets, achievements, prRecords, settings,
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `solo-leveling-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported')
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
      <Download size={16} />
      {exporting ? 'Exporting…' : 'Export data'}
    </Button>
  )
}
