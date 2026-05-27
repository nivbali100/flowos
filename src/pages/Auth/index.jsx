/**
 * Auth page — Login / Signup / Password reset
 * Shown when user is not authenticated (replaces RequireSetup for new users).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

// ─── Error codes → Hebrew messages ───────────────────────────────────────────
const ERR_MAP = {
  'Invalid login credentials':           'אימייל או סיסמה שגויים',
  'Email not confirmed':                 'יש לאשר את האימייל לפני הכניסה',
  'User already registered':             'כתובת האימייל כבר רשומה — כנס עם הסיסמה שלך',
  'Password should be at least 6 characters': 'הסיסמה חייבת להכיל לפחות 6 תווים',
  'Unable to validate email address':    'כתובת אימייל לא תקינה',
}

function hebrewError(msg) {
  if (!msg) return 'שגיאה לא ידועה — נסה שוב'
  for (const [en, he] of Object.entries(ERR_MAP)) {
    if (msg.includes(en)) return he
  }
  return msg
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode,     setMode]     = useState('login')  // 'login' | 'signup' | 'reset'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [message,  setMessage]  = useState(null)

  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'reset') {
        const { error } = await resetPassword(email)
        if (error) { setError(hebrewError(error.message)); return }
        setMessage('נשלח אימייל לאיפוס סיסמה — בדוק את תיבת הדואר שלך')
        return
      }

      if (mode === 'signup') {
        const { user, error } = await signUp(email, password)
        if (error) { setError(hebrewError(error.message)); return }
        if (user && !user.email_confirmed_at) {
          // Email confirmation required
          setMessage('נשלח אימייל אישור — לחץ על הקישור ואז חזור לכאן להתחבר')
          setMode('login')
          return
        }
        // Auto-confirmed (dev mode) — proceed to setup
        navigate('/setup', { replace: true })
        return
      }

      // Login
      const { user, error } = await signIn(email, password)
      if (error) { setError(hebrewError(error.message)); return }
      if (user) {
        const setupDone = !!localStorage.getItem('flowos_setup_complete')
        navigate(setupDone ? '/weekly' : '/setup', { replace: true })
      }

    } finally {
      setLoading(false)
    }
  }

  const titles = {
    login:  'כניסה ל-FlowOS',
    signup: 'הצטרפות ל-FlowOS',
    reset:  'איפוס סיסמה',
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⚡</div>
          <h1 className="text-2xl font-black text-white">FlowOS</h1>
          <p className="text-slate-400 text-sm mt-1">מערכת הביצוע של יזמים</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-5">{titles[mode]}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                כתובת אימייל
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  סיסמה
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="לפחות 6 תווים"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-950 border border-red-800 text-red-300 text-xs font-medium rounded-xl px-3 py-2.5">
                ⚠️ {error}
              </div>
            )}
            {message && (
              <div className="bg-green-950 border border-green-800 text-green-300 text-xs font-medium rounded-xl px-3 py-2.5">
                ✓ {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors"
            >
              {loading ? 'טוען...' : mode === 'login' ? 'כניסה' : mode === 'signup' ? 'הצטרפות' : 'שלח קישור לאיפוס'}
            </button>
          </form>

          {/* Mode switchers */}
          <div className="mt-4 space-y-2 text-center">
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('signup'); setError(null) }}
                  className="text-xs text-slate-400 hover:text-white transition-colors block w-full">
                  אין לך חשבון? הצטרף עכשיו
                </button>
                <button onClick={() => { setMode('reset'); setError(null) }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors block w-full">
                  שכחת סיסמה?
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button onClick={() => { setMode('login'); setError(null) }}
                className="text-xs text-slate-400 hover:text-white transition-colors">
                כבר יש לך חשבון? כנס כאן
              </button>
            )}
            {mode === 'reset' && (
              <button onClick={() => { setMode('login'); setError(null) }}
                className="text-xs text-slate-400 hover:text-white transition-colors">
                חזרה לכניסה
              </button>
            )}
          </div>
        </div>

        {/* Soft disclaimer */}
        <p className="text-center text-xs text-slate-600 mt-4">
          הנתונים שלך שמורים בענן בצורה מאובטחת
        </p>
      </div>
    </div>
  )
}
