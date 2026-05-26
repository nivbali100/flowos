import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { StoreProvider } from './hooks/useStore.js'
import { runMigration } from './utils/migration.js'
import { migrateStoreLegacy } from './hooks/useStore.js'

// Run all data migrations once before React mounts
migrateStoreLegacy()   // clear seed data, migrate blockingPatterns
runMigration()         // v1→v2 task schema

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
