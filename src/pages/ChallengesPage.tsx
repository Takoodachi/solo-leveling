import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { useChallenges, deleteChallenge, type ChallengeWithProgress } from '@/features/challenges/hooks/useChallenges'
import ChallengeCard from '@/features/challenges/components/ChallengeCard'
import NewChallengeSheet from '@/features/challenges/components/NewChallengeSheet'

export default function ChallengesPage() {
  const challenges = useChallenges()
  const [creating, setCreating] = useState(false)

  const current = challenges?.filter(c => c.status === 'active' || c.status === 'upcoming') ?? []
  const past = challenges?.filter(c => c.status === 'completed' || c.status === 'ended') ?? []

  async function remove(c: ChallengeWithProgress) {
    if (!window.confirm(`Remove “${c.title}”?`)) return
    await deleteChallenge(c.uuid)
    toast.success('Challenge removed')
  }

  return (
    <FullScreen className="flex flex-col gap-4">
      <PageHeader
        back="/home"
        title="Challenges"
        action={
          <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
            <Plus size={16} /> New
          </Button>
        }
      />

      {challenges?.length === 0 && (
        <div className="rounded-3xl bg-card p-6 text-center">
          <p className="font-semibold">No challenges yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Set yourself a target — e.g. 12 workouts this month.</p>
        </div>
      )}

      {current.map(c => <ChallengeCard key={c.uuid} challenge={c} onClick={() => void remove(c)} />)}

      {past.length > 0 && (
        <>
          <h2 className="mt-2 text-lg font-semibold">Past</h2>
          {past.map(c => <ChallengeCard key={c.uuid} challenge={c} onClick={() => void remove(c)} />)}
        </>
      )}

      {challenges && challenges.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">Tap a challenge to remove it.</p>
      )}

      <NewChallengeSheet open={creating} onOpenChange={setCreating} />
    </FullScreen>
  )
}
