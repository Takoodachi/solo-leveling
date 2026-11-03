import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { whenReopened } from '@/hooks/useRise'
import { LATEST_APK } from '@/lib/apkBuild'
import { apkBuild, isAndroidApp } from '@/lib/native'

/**
 * The Android app, when it's older than the newest APK (src/lib/apkBuild.ts): says so each time
 * the app is opened (a launch, or back after 30 minutes away), at the owner's request, so it's
 * reinstalled. The site itself is always current; only the native shell can fall behind.
 */
export default function UpdateAppDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isAndroidApp()) return
    const check = () => void apkBuild().then(build => { if (build < LATEST_APK.build) setOpen(true) })
    check()
    return whenReopened(check)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary"><Smartphone size={22} /></span>
          <DialogTitle>A newer app is out</DialogTitle>
          <DialogDescription>
            Install the Solo Leveling APK from {format(parseISO(LATEST_APK.date), 'MMM d, yyyy')} or later to keep everything
            working on this phone. New in it: {LATEST_APK.news}. Your data stays where it is.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full" onClick={() => setOpen(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
