import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { seedDatabase } from '@/db/seed'
import { restoreDraftFromStorage } from '@/features/workouts/store'
import App from './App'
import './index.css'

// Ask the browser not to evict our IndexedDB under storage pressure (best-effort;
// installed home-screen apps on iOS are already exempt from Safari's 7-day cap).
void navigator.storage?.persist?.().catch(() => false)

/**
 * Full-screen error with a Reload button, drawn outside React so it still shows
 * after React has unmounted the app. Never leave the user on a black screen.
 */
function renderFatal(title: string, err: unknown) {
  document.getElementById('fatal-error')?.remove()
  const box = document.createElement('div')
  box.id = 'fatal-error'
  box.setAttribute('role', 'alert')
  box.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;font-family:system-ui;color:#fafafa;background:#0a0a0b'
  const heading = document.createElement('p')
  heading.textContent = title
  heading.style.fontWeight = '600'
  const detail = document.createElement('p')
  detail.textContent = err instanceof Error ? err.message : String(err)
  detail.style.cssText = 'font-size:13px;color:#8e8e95;max-width:320px;word-break:break-word'
  const retry = document.createElement('button')
  retry.textContent = 'Reload'
  retry.style.cssText = 'margin-top:8px;padding:10px 20px;border-radius:999px;background:#fafafa;color:#0a0a0b;font-weight:600;border:0'
  retry.onclick = () => location.reload()
  box.append(heading, detail, retry)
  document.body.append(box)
}

// After a deploy, a page still running the previous build can request code chunks
// that no longer exist. Reloading picks up the new build; guard against reload loops.
const RELOAD_KEY = 'solo:chunkReloadAt'

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Expected a JavaScript/i.test(msg)
}

function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < 30_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // storage unavailable — still try one reload
  }
  location.reload()
  return true
}

window.addEventListener('vite:preloadError', event => {
  event.preventDefault()
  if (!reloadOnce()) renderFatal('A new version of the app is available.', 'Reload to finish updating.')
})

Promise.all([seedDatabase(), restoreDraftFromStorage()])
  .then(() => {
    const root = document.getElementById('root')
    if (!root) throw new Error('#root element not found')
    createRoot(root, {
      // A render error unmounts the whole tree; show what happened instead of a blank page.
      onUncaughtError(error) {
        console.error('Uncaught app error:', error)
        if (isChunkLoadError(error) && reloadOnce()) return
        renderFatal('Something went wrong.', error)
      },
    }).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((err: unknown) => {
    console.error('Failed to initialize database:', err)
    renderFatal('The app couldn’t open its local database.', err)
  })
