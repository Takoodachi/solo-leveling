import { useRef, useState } from 'react'
import type { Table } from 'dexie'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { db } from '@/db'
import { requestSync } from '@/lib/sync'
import { z } from 'zod'

const rows = z.array(z.record(z.string(), z.unknown())).optional()

// v1 backups have the first seven arrays; v2 adds workouts, routines, etc.
const backupSchema = z.object({
  version: z.number(),
  foods: rows, foodLog: rows, bodyMetrics: rows, dailyActivity: rows,
  userStats: rows, targets: rows, achievements: rows, settings: rows,
  exercises: rows, workouts: rows, workoutSets: rows, routines: rows, challenges: rows,
})

type Backup = z.infer<typeof backupSchema>

/**
 * Merge a backup into the local database. Rows keep their original updatedAt
 * and are marked for sync, so newer data already on the server still wins.
 */
async function mergeBackup(data: Backup): Promise<number> {
  const pairs: [Table<Record<string, unknown>, string | number>, Backup[keyof Backup]][] = [
    [db.foods, data.foods], [db.foodLog, data.foodLog], [db.bodyMetrics, data.bodyMetrics],
    [db.dailyActivity, data.dailyActivity], [db.userStats, data.userStats], [db.targets, data.targets],
    [db.achievements, data.achievements], [db.settings, data.settings], [db.exercises, data.exercises],
    [db.workouts, data.workouts], [db.workoutSets, data.workoutSets], [db.routines, data.routines],
    [db.challenges, data.challenges],
  ].map(([table, list]) => [table as unknown as Table<Record<string, unknown>, string | number>, list as Backup[keyof Backup]])

  let count = 0
  await db.transaction('rw', pairs.map(([table]) => table), async () => {
    for (const [table, list] of pairs) {
      if (!Array.isArray(list) || list.length === 0) continue
      await table.bulkPut(list.map(r => ({ ...r, syncPending: true })))
      count += list.length
    }
  })
  return count
}

export default function ImportButton() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const raw: unknown = JSON.parse(await file.text())
      const result = backupSchema.safeParse(raw)
      if (!result.success) {
        toast.error('Invalid backup file')
        return
      }
      const count = await mergeBackup(result.data)
      requestSync()
      toast.success(`Backup merged — ${count} records`)
    } catch (err) {
      console.error('Import failed:', err)
      toast.error('Import failed — check file format')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="secondary"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="gap-2 flex-1"
      >
        <Upload size={16} />
        {importing ? 'Importing…' : 'Import'}
      </Button>
    </>
  )
}
