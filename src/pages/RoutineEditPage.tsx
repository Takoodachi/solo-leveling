import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import RoutineForm, { type RoutineDraft } from '@/features/workouts/components/RoutineForm'
import { useRoutineOrTemplate, saveRoutine, deleteRoutine } from '@/features/workouts/hooks/useRoutines'

function blankRoutine(uuid: string): RoutineDraft {
  return { uuid, name: '', category: 'strength', level: 'intermediate', exercises: [], scheduleDays: [] }
}

export default function RoutineEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const existing = useRoutineOrTemplate(id)
  // Stable id for a new routine (or a copy of a template) across re-renders.
  const [newId] = useState(() => crypto.randomUUID())

  if (!isNew && existing === undefined) return null
  // Templates aren't editable in place; editing starts from a copy.
  const initial: RoutineDraft =
    isNew || !existing ? blankRoutine(newId)
      : existing.kind === 'template' ? { ...existing.routine, uuid: newId }
        : existing.routine

  async function handleSave(r: RoutineDraft) {
    await saveRoutine(r)
    toast.success(isNew ? 'Routine created' : 'Routine saved')
    navigate(`/workouts/routine/${r.uuid}`, { replace: true })
  }

  async function handleDelete() {
    if (!window.confirm('Delete this routine? Past workouts stay in your history.')) return
    await deleteRoutine(initial.uuid)
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
