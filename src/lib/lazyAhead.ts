import { lazy, type ComponentType } from 'react'

/**
 * `lazy()`, for a screen (or a heavy part of one) whose code is also fetched ahead of time:
 * one after another, in the browser's idle moments, once the first screen is up (`loadAhead`).
 * The first screen still loads only what it needs; a second or two later the others are
 * already here, so opening one never waits for its code. The service worker has every file
 * cached, so on a normal launch this reads from the device, not the network.
 */
const waiting: (() => Promise<unknown>)[] = []
let started = false
let fetching = 0

/** A fetch-ahead is in the air: if it fails, that's nobody's navigation, and must not reload the app (main.tsx). */
export const isLoadingAhead = () => fetching > 0

function whenIdle(run: () => void): void {
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1500 })
  else setTimeout(run, 150) // Safari
}

function next(): void {
  const load = waiting.shift()
  if (!load) return
  fetching++
  void load()
    .catch(() => {}) // offline with nothing cached: it's fetched (or fails properly) when it's opened
    .finally(() => {
      fetching--
      whenIdle(next)
    })
}

export function lazyAhead<P>(load: () => Promise<{ default: ComponentType<P> }>) {
  waiting.push(load)
  if (started && fetching === 0 && waiting.length === 1) whenIdle(next) // registered after the rest were done
  return lazy(load)
}

/** Call once the first screen is up. */
export function loadAhead(): void {
  if (started) return
  started = true
  // Not on a connection its owner has asked to go easy on
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return
  setTimeout(() => whenIdle(next), 800) // after the first screen's own work
}
