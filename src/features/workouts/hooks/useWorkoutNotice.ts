import { useEffect, useState } from 'react'
import { isAndroidApp } from '@/lib/native'
import { useWorkoutStore } from '../store'
import { noticeFor, syncWorkoutNotice } from '../workoutNotice'
import { REST_EVENT, restEndsAt } from './useRestTimer'

/**
 * Mount once (in App). In the Android app, keeps the workout notification in step with the
 * workout in progress, wherever in the app you are, and takes it down when the workout is
 * finished or discarded (or wasn't there: one left over from an app that was closed).
 * Not while editing a past workout.
 */
export function useWorkoutNotice(): void {
  const draft = useWorkoutStore(s => s.draft)
  const restored = useWorkoutStore(s => s.restored)
  const [restEnd, setRestEnd] = useState(restEndsAt)
  useEffect(() => {
    const onRest = () => setRestEnd(restEndsAt())
    window.addEventListener(REST_EVENT, onRest)
    return () => window.removeEventListener(REST_EVENT, onRest)
  }, [])
  useEffect(() => {
    if (!restored || !isAndroidApp()) return
    const state = draft && !draft.editing ? noticeFor(draft, restEnd, Date.now()) : null
    syncWorkoutNotice(state).catch(err => console.warn('[workout notice] failed:', err))
  }, [draft, restEnd, restored])
}
