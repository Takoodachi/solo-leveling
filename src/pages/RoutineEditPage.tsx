import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import RoutineForm, { type RoutineDraft } from '@/features/workouts/components/RoutineForm'
import { useRoutineOrTemplate, saveRoutine, deleteRoutine } from '@/features/workouts/hooks/useRoutines'
import { forgetUnsaved } from '@/hooks/useUnsavedChanges'

function blankRoutine(uuid: string): RoutineDraft {
  return { uuid, name: '', category: 'strength', level: 'intermediate', exercises: [], scheduleDays: [] }
}

export default function RoutineEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const existing = useRoutineOrTemplate(id)
  // Stable id for a new routine (or a copy) across re-renders.
  const [newId] = useState(() => crypto.randomUUID())

  if (id && existing === undefined) return null
  // Templates aren't editable in place, and ?copy makes a new routine from one of yours: both start
  // from a copy, saved only when Save is pressed. A copy leaves the plan's days with the original.
  const initial: RoutineDraft =
    !id || !existing ? blankRoutine(newId)
      : existing.kind === 'template' ? { ...existing.routine, uuid: newId }
        : params.has('copy') ? { ...existing.routine, uuid: newId, name: `${existing.routine.name} (copy)`, scheduleDays: [] }
          : existing.routine
  const isNew = initial.uuid === newId

  async function handleSave(r: RoutineDraft) {
    await saveRoutine(r)
    forgetUnsaved('routine')
    toast.success(isNew ? 'Routine created' : 'Routine saved')
    navigate(`/workouts/routine/${r.uuid}`, { replace: true })
  }

  async function handleDelete() {
    if (!window.confirm('Delete this routine? Past workouts stay in your history.')) return
    await deleteRoutine(initial.uuid)
    forgetUnsaved('routine')
    toast.success('Routine deleted')
    navigate('/workouts', { replace: true })
  }

  return (
    <FullScreen className="flex flex-col gap-4">
      <PageHeader back="/workouts" title={isNew ? 'New routine' : 'Edit routine'} />
      <RoutineForm
        key={initial.uuid}
        initial={initial}
        onSave={handleSave}
        onDelete={!isNew && existing?.kind === 'routine' ? handleDelete : undefined}
      />
    </FullScreen>
  )
}
