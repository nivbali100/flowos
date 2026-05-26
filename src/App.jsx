import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'

// ─── Lazy-loaded pages — each becomes a separate JS chunk ─────────────────────
const GameRules    = lazy(() => import('./pages/GameRules/index.jsx'))
const Onboarding   = lazy(() => import('./pages/Onboarding/index.jsx'))
const Journey      = lazy(() => import('./pages/Journey/index.jsx'))
const Dashboard    = lazy(() => import('./pages/Dashboard/index.jsx'))
const Goals        = lazy(() => import('./pages/Goals/index.jsx'))
const Weekly       = lazy(() => import('./pages/Weekly/index.jsx'))
const Daily        = lazy(() => import('./pages/Daily/index.jsx'))
const Performance  = lazy(() => import('./pages/Performance/index.jsx'))
const Admin        = lazy(() => import('./pages/Admin/index.jsx'))
const Setup        = lazy(() => import('./pages/Setup/index.jsx'))
const Profile      = lazy(() => import('./pages/Profile/index.jsx'))
const ImportPage   = lazy(() => import('./pages/Import/index.jsx'))

// ─── Loading skeleton shown while a page chunk loads ─────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
        <span className="text-xs text-slate-400 font-medium">טוען...</span>
      </div>
    </div>
  )
}

// ─── First-run guard ──────────────────────────────────────────────────────────
// Redirects to /setup if the user hasn't completed the wizard yet.
function RequireSetup({ children }) {
  const setupDone = !!localStorage.getItem('flowos_setup_complete')
  if (!setupDone) return <Navigate to="/setup" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Full-screen setup wizard (no shell) ── */}
          <Route path="/setup" element={<Setup />} />

          {/* ── URL-based weekly form import (bypasses RequireSetup so n8n redirects always work) ── */}
          <Route path="/import" element={
            <RequireSetup>
              <ImportPage />
            </RequireSetup>
          } />

          {/* ── Main app (with shell + first-run guard) ── */}
          <Route element={
            <RequireSetup>
              <AppShell />
            </RequireSetup>
          }>
            <Route path="/rules"       element={<GameRules />} />
            <Route path="/onboarding"  element={<Onboarding />} />
            <Route path="/"            element={<Navigate to="/weekly" replace />} />
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/goals"       element={<Goals />} />
            <Route path="/daily"       element={<Daily />} />
            <Route path="/weekly"      element={<Weekly />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/admin"       element={<Admin />} />
            <Route path="/profile"     element={<Profile />} />
          </Route>

        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
