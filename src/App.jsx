import { Suspense, lazy, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'
import { AuthProvider, useAuth } from './hooks/useAuth.js'

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
const AuthPage     = lazy(() => import('./pages/Auth/index.jsx'))

// ─── Loading skeleton shown while a page chunk loads ─────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
        <span className="text-xs text-slate-400 font-medium">טוען...</span>
      </div>
    </div>
  )
}

// ─── Auth guard — redirects to /auth if not logged in ─────────────────────────
// Falls back gracefully: if Supabase is not configured, allows access
// (single-user local mode stays functional)
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const hasSupabase = !!import.meta.env.VITE_SUPABASE_ANON

  // No Supabase key = local-only mode, skip auth
  if (!hasSupabase) return children

  // Still resolving session from localStorage
  if (loading) return <PageLoader />

  // Not authenticated → redirect to auth page
  if (!isAuthenticated) return <Navigate to="/auth" replace />

  return children
}

// ─── Setup guard — redirects to /setup if first-run wizard not complete ───────
function RequireSetup({ children }) {
  const setupDone = !!localStorage.getItem('flowos_setup_complete')
  if (!setupDone) return <Navigate to="/setup" replace />
  return children
}

// ─── Storage-full warning banner ─────────────────────────────────────────────
function StorageWarningBanner() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    function handleFull() { setVisible(true) }
    window.addEventListener('flowos:storage-full', handleFull)
    return () => window.removeEventListener('flowos:storage-full', handleFull)
  }, [])
  if (!visible) return null
  return (
    <div className="fixed top-0 inset-x-0 z-[9999] bg-red-600 text-white text-sm font-bold px-4 py-3 flex items-center justify-between shadow-lg">
      <span>⚠️ הזיכרון המקומי מלא — שמירת נתונים עלולה להיכשל. סגור שבוע ישן או מחק משימות.</span>
      <button onClick={() => setVisible(false)} className="mr-4 text-white/80 hover:text-white text-lg leading-none">✕</button>
    </div>
  )
}

// ─── Root app ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <StorageWarningBanner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>

            {/* ── Auth (public) ── */}
            <Route path="/auth" element={<AuthPage />} />

            {/* ── Full-screen setup wizard (auth required, no shell) ── */}
            <Route path="/setup" element={
              <RequireAuth>
                <Setup />
              </RequireAuth>
            } />

            {/* ── URL-based weekly form import (bypasses RequireSetup so n8n redirects work) ── */}
            <Route path="/import" element={
              <RequireAuth>
                <RequireSetup>
                  <ImportPage />
                </RequireSetup>
              </RequireAuth>
            } />

            {/* ── Main app (auth + setup + shell) ── */}
            <Route element={
              <RequireAuth>
                <RequireSetup>
                  <AppShell />
                </RequireSetup>
              </RequireAuth>
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
    </AuthProvider>
  )
}
