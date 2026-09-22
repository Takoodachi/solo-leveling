import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { db } from '@/db'
import { format } from 'date-fns'

const BACKUP_VERSION = 2

export default function ExportButton() {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const [
        foods, foodLog, bodyMetrics, dailyActivity, userStats, targets, achievements, settings,
        exercises, workouts, workoutSets, routines, challenges, checkins,
      ] = await Promise.all([
        db.foods.filter(f => f.isCustom || f.isFavorite).toArray(),
        db.foodLog.toArray(),
        db.bodyMetrics.toArray(),
        db.dailyActivity.toArray(),
        db.userStats.toArray(),
        db.targets.toArray(),
        db.achievements.toArray(),
        db.settings.toArray(),
        db.exercises.filter(e => e.isCustom).toArray(),
        db.workouts.toArray(),
        db.workoutSets.toArray(),
        db.routines.toArray(),
        db.challenges.toArray(),
        db.checkins.toArray(),
      ])

      const data = {
        version: BACKUP_VERSION,
        exportedAt: Date.now(),
        foods, foodLog, bodyMetrics, dailyActivity,
        userStats, targets, achievements, settings,
        exercises, workouts, workoutSets, routines, challenges, checkins,
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
    <Button variant="secondary" onClick={handleExport} disabled={exporting} className="gap-2 flex-1">
      <Download size={16} />
      {exporting ? 'Exporting…' : 'Export'}
    </Button>
  )
}
