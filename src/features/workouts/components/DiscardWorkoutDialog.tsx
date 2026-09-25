import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Editing a saved workout: discarding drops the changes, not the workout. */
  editing: boolean
  onDiscard: () => void
}

export default function DiscardWorkoutDialog({ open, onOpenChange, editing, onDiscard }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader className="text-left">
          <DialogTitle>{editing ? 'Discard changes?' : 'Discard workout?'}</DialogTitle>
          <DialogDescription>
            {editing ? 'The workout stays as it was saved.' : 'Nothing from this session will be saved.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            {editing ? 'Keep editing' : 'Keep going'}
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onDiscard}>Discard</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
