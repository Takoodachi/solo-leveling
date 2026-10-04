/**
 * Small "you can feel it" feedback. Android (browser and app) vibrates. iPhones have no
 * vibration API on the web; the one haptic Safari gives a page is the tick of a native switch
 * (iOS 18+), so `tap` toggles a hidden one. Elsewhere nothing happens.
 */

/** Longer buzzes, e.g. the rest timer ending. Android only. */
export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // not allowed before the first tap on the page
  }
}

function switchTick(): void {
  const label = document.createElement('label')
  label.ariaHidden = 'true'
  label.style.display = 'none'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.append(input)
  document.head.append(label)
  label.click()
  label.remove()
}

/** A light tick for something you just did (a set checked off). Call it from the tap itself. */
export function tap(): void {
  if (typeof navigator.vibrate === 'function') buzz(12)
  else switchTick()
}
