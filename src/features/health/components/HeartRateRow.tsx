import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { soloHas } from '@/lib/native'
import { useRefreshOnReturn } from '@/hooks/useRefreshOnReturn'

const load = () => import('../healthSteps')

/** Settings → Steps: heart rate from the watch, filled into each workout logged live. */
export default function HeartRateRow() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const supported = soloHas('heartRate')

  const refresh = useCallback(
    () => (supported ? load().then(h => h.heartRateAllowed()).then(setAllowed, () => setAllowed(null)) : Promise.resolve()),
    [supported],
  )
  // Access can be changed in Health Connect while we're away
  useRefreshOnReturn(refresh)

  const allow = async () => {
    const ok = await load().then(h => h.allowHeartRate()).catch(() => false)
    setAllowed(ok)
    if (!ok) toast('Heart rate wasn’t allowed. You can turn it on in Health Connect.')
  }

  if (!supported) {
    return <p className="text-xs text-muted-foreground">Install the latest Android app to fill in each workout’s heart rate from your watch.</p>
  }
  if (allowed === null) return null
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-secondary px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Heart rate in workouts</p>
        <p className="text-xs text-muted-foreground">
          {allowed
            ? 'Filled in from your watch after each workout, with the calorie estimate'
            : 'Fill in each workout’s heart rate from your watch'}
        </p>
      </div>
      {!allowed && <Button size="sm" onClick={() => void allow()}>Allow</Button>}
    </div>
  )
}
