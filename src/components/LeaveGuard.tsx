import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUnsavedStore } from '@/hooks/useUnsavedChanges'

/**
 * Mounted once, inside the router: while something has unsaved changes (`useUnsavedChanges`),
 * leaving its screen asks first, whether by a link, the bottom bar, Back or Android's Back. A
 * change of search or hash on the same screen isn't leaving. Closing or reloading the page gets
 * the browser's own question.
 */
export default function LeaveGuard() {
  const what = useUnsavedStore(s => Object.values(s.open)[0])
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    currentLocation.pathname !== nextLocation.pathname && Object.keys(useUnsavedStore.getState().open).length > 0,
  )

  useEffect(() => {
    if (!what) return
    const ask = (e: BeforeUnloadEvent) => e.preventDefault()
    addEventListener('beforeunload', ask)
    return () => removeEventListener('beforeunload', ask)
  }, [what])

  const stay = () => blocker.reset?.()
  return (
    <Dialog open={blocker.state === 'blocked'} onOpenChange={o => !o && stay()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle>Leave without saving?</DialogTitle>
          <DialogDescription>Your changes to {what ?? 'this screen'} haven’t been saved.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={stay}>Keep editing</Button>
          <Button
            className="flex-1"
            onClick={() => {
              useUnsavedStore.setState({ open: {} })
              blocker.proceed?.()
            }}
          >
            Leave
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
