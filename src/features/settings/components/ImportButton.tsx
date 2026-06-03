import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { db } from '@/db'
import { z } from 'zod'

const backupSchema = z.object({
  version: z.number(),
  foods:       z.array(z.unknown()),
  foodLog:     z.array(z.unknown()),
  bodyMetrics: z.array(z.unknown()),
  userStats:   z.array(z.unknown()),
  targets:     z.array(z.unknown()),
  achievements: z.array(z.unknown()),
  settings:    z.array(z.unknown()),
})

export default function ImportButton() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const raw: unknown = JSON.parse(text)
      const result = backupSchema.safeParse(raw)

      if (!result.success) {
        toast.error('Invalid backup file')
        return
      }

      const data = result.data

      const tables = [db.foods, db.foodLog, db.bodyMetrics, db.userStats, db.targets, db.achievements, db.settings]
      await db.transaction('rw', tables, async () => {
        await db.foods.clear();       await db.foods.bulkAdd(data.foods as Parameters<typeof db.foods.bulkAdd>[0])
        await db.foodLog.clear();     await db.foodLog.bulkAdd(data.foodLog as Parameters<typeof db.foodLog.bulkAdd>[0])
        await db.bodyMetrics.clear(); await db.bodyMetrics.bulkAdd(data.bodyMetrics as Parameters<typeof db.bodyMetrics.bulkAdd>[0])
        await db.userStats.clear();   await db.userStats.bulkAdd(data.userStats as Parameters<typeof db.userStats.bulkAdd>[0])
        await db.targets.clear();     await db.targets.bulkAdd(data.targets as Parameters<typeof db.targets.bulkAdd>[0])
        await db.achievements.clear();await db.achievements.bulkAdd(data.achievements as Parameters<typeof db.achievements.bulkAdd>[0])
        await db.settings.clear();    await db.settings.bulkAdd(data.settings as Parameters<typeof db.settings.bulkAdd>[0])
      })

      toast.success('Data imported successfully')
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
        accept=".json"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="gap-2"
      >
        <Upload size={16} />
        {importing ? 'Importing…' : 'Import data'}
      </Button>
    </>
  )
}
