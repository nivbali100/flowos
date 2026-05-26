import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import BottomNav from './BottomNav.jsx'
import VisionBanner from './VisionBanner.jsx'
import ErrorBoundary from '../ui/ErrorBoundary.jsx'

// ─── Storage Full Toast ───────────────────────────────────────────────────────
function StorageFullToast() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    function handler() { setShow(true) }
    window.addEventListener('flowos:storage-full', handler)
    return () => window.removeEventListener('flowos:storage-full', handler)
  }, [])

  if (!show) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] max-w-sm w-full px-4">
      <div className="bg-red-600 text-white rounded-xl px-4 py-3 shadow-xl flex items-start gap-3">
        <span className="text-lg shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">הזיכרון המקומי מלא</p>
          <p className="text-xs mt-0.5 text-red-100">נתונים חדשים לא נשמרים. מחק נתונים ישנים או פנה את הדפדפן.</p>
        </div>
        <button onClick={() => setShow(false)} className="text-red-200 hover:text-white shrink-0 text-lg leading-none">×</button>
      </div>
    </div>
  )
}

export default function AppShell() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="ltr">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto min-h-screen pb-20 md:pb-0">
        <VisionBanner />
        {/* key forces remount on route change → triggers CSS enter animation */}
        <div key={location.pathname} className="animate-slide-up">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      <BottomNav />
      <StorageFullToast />
    </div>
  )
}
