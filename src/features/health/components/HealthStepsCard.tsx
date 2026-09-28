import { useCallback, useEffect, useState } from 'react'
import { formatDistance } from 'date-fns'
import { Footprints, RefreshCw, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useNow } from '@/hooks/useNow'
import type { HealthStatus } from '../healthSteps'
import HealthStepsDiagnosis from './HealthStepsDiagnosis'

const load = () => import('../healthSteps')

type Status = HealthStatus | 'checking' | 'error'

const BLURB: Record<Status, string> = {
  checking: 'Checking Health Connect…',
  error: 'Couldn’t reach Health Connect.',
  unavailable: 'Health Connect isn’t set up on this phone. It’s built into Android 14 and newer; older versions get it from the Play Store.',
  'needs-permission': 'Import your daily steps automatically. In Samsung Health, turn on Settings → Health Connect first, then allow step access here.',
  connected: 'Steps update whenever you open the app. Days you’ve typed in yourself are only raised, never lowered.',
}

/** Settings (Android app only): connect Samsung Health steps through Health Connect. */
export default function HealthStepsCard() {
  const [status, setStatus] = useState<Status>('checking')
  const [lastImport, setLastImport] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [checks, setChecks] = useState(0) // bumps the Health Connect readout on each status check
  const now = useNow()

  const refresh = useCallback(
    () =>
      load()
        .then(async h => {
          const next = await h.getStatus()
          setStatus(next)
          setLastImport(h.lastImportAt())
          setChecks(c => c + 1)
        })
        .catch(() => setStatus('error')),
    [],
  )

  useEffect(() => {
    void refresh()
    // Permissions can change in Health Connect while we're in the background
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  const importNow = async () => {
    setBusy(true)
    try {
      const h = await load()
      const days = await h.importSteps()
      setLastImport(h.lastImportAt())
      toast.success(days ? `Steps updated for ${days} day${days === 1 ? '' : 's'}` : 'Steps are up to date')
    } catch {
      toast.error('Couldn’t import steps')
    } finally {
      setBusy(false)
    }
  }

  const openSettings = () => void load().then(h => h.openHealthConnectSettings()).catch(() => toast.error('Couldn’t open Health Connect'))

  const connect = async () => {
    setBusy(true)
    try {
      const h = await load()
      if (await h.connect()) {
        setStatus('connected')
        await importNow()
      } else {
        toast('Step access wasn’t allowed. You can turn it on in Health Connect.')
        await refresh()
      }
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Footprints size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Samsung Health</p>
          <p className="text-xs text-muted-foreground">
            {status === 'connected'
              ? lastImport
                ? `Connected · last import ${lastImport >= now.getTime() ? 'just now' : formatDistance(lastImport, now, { addSuffix: true })}`
                : 'Connected'
              : 'Through Health Connect'}
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{BLURB[status]}</p>
      {status === 'needs-permission' && (
        <div className="flex flex-col gap-2">
          <Button disabled={busy} onClick={() => void connect()}>Connect</Button>
          {/* After two declines Health Connect stops asking; access is then only granted there */}
          <Button variant="secondary" className="gap-2" onClick={openSettings}>
            <Settings2 size={16} /> Open Health Connect
          </Button>
        </div>
      )}
      {status === 'unavailable' && (
        <Button variant="secondary" onClick={() => void load().then(h => h.getHealthConnect())}>Get Health Connect</Button>
      )}
      {status === 'error' && (
        <Button variant="secondary" onClick={() => void refresh()}>Try again</Button>
      )}
      {status === 'connected' && (
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 gap-2" disabled={busy} onClick={() => void importNow()}>
            <RefreshCw size={16} className={busy ? 'animate-spin' : undefined} /> Import now
          </Button>
          <Button variant="secondary" className="flex-1 gap-2" onClick={openSettings}>
            <Settings2 size={16} /> Health Connect
          </Button>
        </div>
      )}
      {status === 'connected' && <HealthStepsDiagnosis version={(lastImport ?? 0) + checks} />}
    </div>
  )
}
