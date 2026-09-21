import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { seedDatabase } from '@/db/seed'
import { restoreDraftFromStorage } from '@/features/workouts/store'
import App from './App'
import './index.css'

// Ask the browser not to evict our IndexedDB under storage pressure (best-effort;
// installed home-screen apps on iOS are already exempt from Safari's 7-day cap).
void navigator.storage?.persist?.().catch(() => false)

function renderFatal(err: unknown) {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML = ''
  const box = document.createElement('div')
  box.style.cssText = 'min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;font-family:system-ui;color:#fafafa;background:#0a0a0b'
  const title = document.createElement('p')
  title.textContent = 'The app couldn’t open its local database.'
  title.style.fontWeight = '600'
  const detail = document.createElement('p')
  detail.textContent = err instanceof Error ? err.message : String(err)
  detail.style.cssText = 'font-size:13px;color:#8e8e95;max-width:320px'
  const retry = document.createElement('button')
  retry.textContent = 'Reload'
  retry.style.cssText = 'margin-top:8px;padding:10px 20px;border-radius:999px;background:#fafafa;color:#0a0a0b;font-weight:600;border:0'
  retry.onclick = () => location.reload()
  box.append(title, detail, retry)
  root.append(box)
}

Promise.all([seedDatabase(), restoreDraftFromStorage()])
  .then(() => {
    const root = document.getElementById('root')
    if (!root) throw new Error('#root element not found')
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((err: unknown) => {
    console.error('Failed to initialize database:', err)
    renderFatal(err)
  })
