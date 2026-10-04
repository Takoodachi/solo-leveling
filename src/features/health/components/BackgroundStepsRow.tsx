import { useCallback, useEffect, useState } from 'react'
import { formatDistance } from 'date-fns'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { useNow } from '@/hooks/useNow'
import { soloPlugin, type BackgroundStepsStatus } from '@/lib/native'

/** `old-app`: an Android app built before background sync existed. */
type State = BackgroundStepsStatus | 'old-app' | null

/** Settings → Steps: keep steps syncing about once an hour while the app is closed. */
export default function BackgroundStepsRow() {
  const [state, setState] = useState<State>(null)
  const [busy, setBusy] = useState(false)
  const now = useNow()

  const refresh = useCallback(
    () =>
      soloPlugin()
        .then(async plugin => setState(plugin ? await plugin.backgroundStepsStatus() : 'old-app'))
        .catch(() => setState(null)),
    [],
  )

  useEffect(() => {
    void refresh()
    // Access can be changed in Health Connect, and a run may have finished, while we were away
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  async function toggle(on: boolean) {
    setBusy(true)
    try {
      const plugin = await soloPlugin()
      if (!plugin) return
      const next = await (on ? plugin.enableBackgroundSteps() : plugin.disableBackgroundSteps())
      setState(next)
      if (on && !next.enabled) {
        toast('Background access wasn’t allowed', { description: 'Turn on “Access data in the background” for Solo Leveling in Health Connect.', duration: 8000 })
      }
    } catch {
      toast.error('Couldn’t change background sync')
    } finally {
      setBusy(false)
    }
  }

  if (state === null) return null
  if (state === 'old-app' || !state.supported) {
    return (
      <p className="text-xs text-muted-foreground">
        {state === 'old-app'
          ? 'Install the latest Android app to keep steps syncing while it’s closed.'
          : 'This phone’s Health Connect can’t share steps with a closed app, so they sync when you open it.'}
      </p>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-secondary px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Sync in the background</p>
        <p className="text-xs text-muted-foreground">
          {state.enabled && state.lastRunAt
            ? `${state.lastResult ?? 'Ran'} · ${formatDistance(Math.min(state.lastRunAt, now.getTime()), now, { addSuffix: true })}`
            : 'About once an hour while the app is closed'}
        </p>
      </div>
      <Switch checked={state.enabled} disabled={busy} onCheckedChange={on => void toggle(on)} aria-label="Sync steps in the background" />
    </div>
  )
}
