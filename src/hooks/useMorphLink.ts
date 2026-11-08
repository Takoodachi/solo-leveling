import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { morphOpen } from '@/lib/morph'

/**
 * Click handlers for links whose element (the link itself, or the data-morph element inside it)
 * grows into the element marked `toKey` on the screen they open (lib/morph.ts). Where it can't
 * morph, the link navigates as usual.
 */
export function useMorphLink(): (to: string, toKey: string) => (e: MouseEvent<HTMLElement>) => void {
  const navigate = useNavigate()
  return (to, toKey) => e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const from = e.currentTarget.dataset.morph ? e.currentTarget : e.currentTarget.querySelector<HTMLElement>('[data-morph]')
    if (from && morphOpen(from, toKey, () => navigate(to))) e.preventDefault()
  }
}
