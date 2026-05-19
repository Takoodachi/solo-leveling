export function formatKcal(kcal: number): string {
  return Math.round(kcal).toLocaleString()
}

export function formatWeight(kg: number): string {
  return `${kg % 1 === 0 ? kg : kg.toFixed(1)} kg`
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function formatDurationMin(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatMacro(grams: number): string {
  return `${Math.round(grams)}g`
}

export function formatDistance(km: number): string {
  return `${km.toFixed(2)} km`
}

export function clampPercent(value: number, max: number): number {
  if (max === 0) return 0
  return Math.min(100, Math.round((value / max) * 100))
}
