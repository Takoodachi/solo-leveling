import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { whenReopened } from '@/hooks/useRise'
import { LATEST_APK, apkUrl } from '@/lib/apkBuild'
import { installApk } from '@/lib/appUpdate'
import { apkBuild, isAndroidApp, soloHas } from '@/lib/native'

/**
 * The Android app, when it's older than the newest APK (src/lib/apkBuild.ts): says so each time
 * the app is opened (a launch, or back after 30 minutes away), at the owner's request. From build
 * 11 the app installs the new one itself as it's left (lib/appUpdate.ts), and this offers it now;
 * an older APK is asked to install it by hand, from its link. The site itself is always current;
 * only the native shell can fall behind.
 */
export default function UpdateAppDialog() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selfUpdates = soloHas('updateApp')
  const date = format(parseISO(LATEST_APK.date), 'MMM d, yyyy')

  useEffect(() => {
    if (!isAndroidApp()) return
    const check = () => void apkBuild().then(build => { if (build < LATEST_APK.build) setOpen(true) })
    check()
    return whenReopened(check)
  }, [])

  const updateNow = () => {
    setBusy(true)
    setError(null)
    // Once it's in the app closes, so only a failure comes back
    installApk().catch((err: unknown) => {
      setBusy(false)
      setError(err instanceof Error ? err.message : String(err))
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary"><Smartphone size={22} /></span>
          <DialogTitle>A newer app is out</DialogTitle>
          {selfUpdates ? (
            <DialogDescription>
              Build {LATEST_APK.build}, from {date}, brings {LATEST_APK.news}. It installs itself the next time you leave the app
              with no workout open, or now: the app closes, and a notification opens it again. Your data stays where it is.
            </DialogDescription>
          ) : (
            <DialogDescription>
              Install the Solo Leveling APK from {date} or later to keep everything working on this phone. New in it: {LATEST_APK.news}.
              Your data stays where it is, and from that one on the app updates itself.
            </DialogDescription>
          )}
        </DialogHeader>
        {error && <p className="text-center text-sm text-destructive">Couldn’t update: {error}</p>}
        <div className="flex gap-2">
          {selfUpdates ? (
            <>
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Later</Button>
              {/* Focused, so the dialog's focus ring isn't on Later */}
              <Button className="flex-1" autoFocus disabled={busy} onClick={updateNow}>{busy ? 'Updating…' : 'Update now'}</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>OK</Button>
              {/* The Android app hands any outside address to the phone's browser, which downloads it */}
              <Button asChild className="flex-1">
                <a href={apkUrl(LATEST_APK.build)} target="_blank" rel="noopener noreferrer">Download it</a>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
