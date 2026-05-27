/**
 * Profile — edit name, email, business name.
 * Changes sync immediately to localStorage + Supabase (fire-and-forget).
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, User, Mail, Briefcase, AlertTriangle, LogOut } from 'lucide-react'
import TopBar from '../../components/layout/TopBar.jsx'
import { useStore } from '../../hooks/useStore.js'
import { useAuth } from '../../hooks/useAuth.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Profile() {
  const { profile, updateProfile, resetAll } = useStore()
  const { signOut, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [name,         setName]         = useState(profile?.name         || '')
  const [email,        setEmail]        = useState(profile?.email        || '')
  const [businessName, setBusinessName] = useState(profile?.businessName || '')

  const [saved,        setSaved]        = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)

  const canSave = name.trim().length >= 2 && EMAIL_RE.test(email)
  const dirty   = name !== (profile?.name || '') ||
                  email !== (profile?.email || '') ||
                  businessName !== (profile?.businessName || '')

  function handleSave() {
    if (!canSave) return
    updateProfile({
      name:         name.trim(),
      email:        email.trim().toLowerCase(),
      businessName: businessName.trim(),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleReset() {
    resetAll()
    navigate('/setup', { replace: true })
  }

  async function handleSignOut() {
    await signOut()
    navigate('/auth', { replace: true })
  }

  return (
    <div dir="rtl">
      <TopBar title="פרופיל והגדרות" />
      <div className="px-4 py-5 max-w-md mx-auto space-y-5">

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Avatar header */}
          <div className="bg-gradient-to-l from-brand-600 to-indigo-600 px-5 py-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black text-white shrink-0">
              {name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-base font-black text-white leading-tight">{name || 'שם לא הוגדר'}</p>
              <p className="text-sm text-white/70 mt-0.5">{email || 'אימייל לא הוגדר'}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="p-5 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <User className="w-3.5 h-3.5" /> שם מלא
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="שם מלא"
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Mail className="w-3.5 h-3.5" /> אימייל
                <span className="text-[10px] text-brand-500 font-bold bg-brand-50 px-1.5 py-0.5 rounded-full">
                  מזהה ייחודי
                </span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="you@example.com"
                className={`w-full text-sm border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-300 ${emailTouched && email && !EMAIL_RE.test(email) ? 'border-red-400' : 'border-slate-200'}`}
              />
              {emailTouched && email && !EMAIL_RE.test(email) && (
                <p className="text-xs text-red-500">כתובת אימייל לא תקינה</p>
              )}
              <p className="text-[11px] text-slate-400">
                האימייל משמש לזיהוי שלך בדשבורד המלווה — ודא שהוא נכון
              </p>
            </div>

            {/* Business name */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Briefcase className="w-3.5 h-3.5" /> שם עסק / מותג
              </label>
              <input
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="הפסגה, NivFit..."
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!canSave || !dirty}
              className={[
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all duration-200',
                saved
                  ? 'bg-green-500 text-white'
                  : canSave && dirty
                    ? 'bg-brand-600 hover:bg-brand-700 text-white'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed',
              ].join(' ')}
            >
              {saved
                ? <><Check className="w-4 h-4" /> נשמר ועודכן בענן</>
                : 'שמור שינויים'}
            </button>
          </div>
        </div>

        {/* Supabase sync status */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${profile?.email && EMAIL_RE.test(profile.email) ? 'bg-green-400' : 'bg-amber-400'}`} />
          <div>
            <p className="text-xs font-bold text-slate-700">
              {profile?.email && EMAIL_RE.test(profile.email) ? 'מחובר לענן' : 'לא מסונכרן — הזן אימייל תקני'}
            </p>
            <p className="text-[11px] text-slate-400">
              {profile?.email && EMAIL_RE.test(profile.email)
                ? 'הנתונים שלך מגובים ב-Supabase ונגישים למלווה'
                : 'שמור אימייל תקני כדי לאפשר סנכרון וגיבוי'}
            </p>
          </div>
        </div>

        {/* Sign out */}
        {isAuthenticated && (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-sm font-semibold rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            התנתק
          </button>
        )}

        {/* Danger zone */}
        <div className="border border-red-100 rounded-xl overflow-hidden">
          <div className="bg-red-50 px-4 py-2.5 border-b border-red-100">
            <p className="text-xs font-black text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> אזור מסוכן
            </p>
          </div>
          <div className="p-4">
            {!confirmReset ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700">איפוס מלא</p>
                  <p className="text-xs text-slate-400 mt-0.5">מוחק את כל הנתונים ומחזיר להגדרות ראשוניות</p>
                </div>
                <button
                  onClick={() => setConfirmReset(true)}
                  className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl transition-colors shrink-0"
                >
                  אפס הכל
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-black text-red-700">⚠ האם אתה בטוח לחלוטין?</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  כל המשימות, היעדים, הסיכומים השבועיים וההיסטוריה יימחקו לצמיתות.
                </p>
                <div className="flex gap-2">
                  <button onClick={handleReset}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-black rounded-xl transition-colors">
                    כן, מחק הכל
                  </button>
                  <button onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors">
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Version footer */}
        <p className="text-center text-[11px] text-slate-300 pb-2">
          FlowOS · הפסגה · כל הנתונים נשמרים מקומית + ענן
        </p>
      </div>
    </div>
  )
}
