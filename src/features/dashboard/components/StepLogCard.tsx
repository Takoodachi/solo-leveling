import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Footprints, Check } from 'lucide-react'
import { db } from '@/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDailyActivity } from '../hooks/useDailyActivity'
import { today } from '@/lib/date'

export default function StepLogCard() {
  const todayStr = today()
  const todayEntry = useLiveQuery(
    () => db.dailyActivity.where('date').equals(todayStr).first(),
    [todayStr],
  )
  const { logSteps } = useDailyActivity()
  const [draft, setDraft] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // Keep the draft in sync with what's saved.
  useEffect(() => {
    if (todayEntry?.steps != null && draft === '') {
      setDraft(String(todayEntry.steps))
    }
  }, [todayEntry, draft])

  async function handleSave() {
    const n = Math.max(0, Math.round(Number(draft)))
    if (!Number.isFinite(n) || n <= 0) return
    setSaving(true)
    try {
      await logSteps(todayStr, n)
      setSavedAt(Date.now())
      setTimeout(() => setSavedAt(prev => (prev && Date.now() - prev >= 1500 ? null : prev)), 1500)
    } finally {
      setSaving(false)
    }
  }

  const showSaved = savedAt != null

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted shrink-0">
          <Footprints size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Today's steps</p>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              inputMode="numeric"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={todayEntry?.steps != null ? String(todayEntry.steps) : '0'}
              className="h-9"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !draft.trim() || Number(draft) <= 0}
              className="gap-1.5 shrink-0"
            >
              {showSaved ? <Check size={14} /> : null}
              {showSaved ? 'Saved' : todayEntry ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
