import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { seedDatabase } from '@/db/seed'
import App from './App'
import './index.css'

seedDatabase()
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
  })
