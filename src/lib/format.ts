/** To one decimal place (grams of a macro). */
export const round1 = (n: number) => Math.round(n * 10) / 10

export function formatKcal(kcal: number): string {
  return Math.round(kcal).toLocaleString()
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const mmss = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return h > 0 ? `${h}:${mmss}` : mmss
}

export function formatDurationMin(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function clampPercent(value: number, max: number): number {
  if (max === 0) return 0
  return Math.min(100, Math.round((value / max) * 100))
}
