/**
 * Setup Wizard — first-run onboarding for FlowOS.
 * 5 steps: Personal → Starting Point → Annual Vision → Quarterly → Monthly
 * On completion: calls completeSetup() and redirects to /dashboard.
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useStore } from '../../hooks/useStore.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import { upsertCoach } from '../../lib/supabase.js'

// ─── Validation helpers ───────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Draft persistence — survives accidental refresh ─────────────────────────
const DRAFT_KEY = 'flowos_setup_draft'
function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') } catch { return null }
}

// ─── Shared input components ──────────────────────────────────────────────────

function Input({ label, hint, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-slate-700">{label}</label>
      {hint && <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
    </div>
  )
}

function CurrencyInput({ label, hint, value, onChange, placeholder = '0' }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-slate-700">{label}</label>
      {hint && <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>}
      <div className="relative">
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₪</span>
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          placeholder={placeholder}
          className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
    </div>
  )
}

function SliderInput({ label, hint, value, onChange, min = 1, max = 10 }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-700">{label}</label>
        <span className="text-lg font-black text-brand-600 w-8 text-left">{value}</span>
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-brand-600"
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  )
}

function KeyMoveInput({ index, value, onChange }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-black flex items-center justify-center shrink-0 mt-3">
        {index + 1}
      </div>
      <textarea
        rows={2} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={`מהלך מרכזי ${index + 1}...`}
        className="flex-1 text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
    </div>
  )
}

// ─── Blocking Patterns — multi-entry, up to 5 ────────────────────────────────

function SetupBlockingPatterns({ patterns, onChange }) {
  const list = (Array.isArray(patterns) && patterns.length) ? patterns : ['']
  const canAdd = list.length < 5

  function handleChange(idx, val) {
    const next = [...list]; next[idx] = val; onChange(next)
  }
  function handleAdd() {
    if (canAdd) onChange([...list, ''])
  }
  function handleRemove(idx) {
    if (list.length <= 1) { onChange(['']); return }
    onChange(list.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <label className="block text-sm font-bold text-slate-700">דפוסים ותקיעויות (עד 5)</label>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            מה חוזר על עצמו בכל פעם שמנסים להתקדם? לדוגמה: "כשלוחץ — בורח לניהול".
          </p>
        </div>
        {canAdd && (
          <button type="button" onClick={handleAdd}
            className="text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg transition-colors shrink-0 mt-0.5">
            + הוסף
          </button>
        )}
      </div>
      <div className="space-y-2">
        {list.map((p, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-2.5">
              {idx + 1}
            </div>
            <textarea
              rows={2} value={p}
              onChange={e => handleChange(idx, e.target.value)}
              placeholder={idx === 0
                ? 'לדוגמה: כשמתחיל ללחות אני בורח לטכניקה במקום למכירות...'
                : `דפוס ${idx + 1}...`}
              className="flex-1 text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {list.length > 1 && (
              <button type="button" onClick={() => handleRemove(idx)}
                className="mt-2.5 text-slate-300 hover:text-red-400 transition-colors text-xl leading-none shrink-0">
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Realism checkers ─────────────────────────────────────────────────────────

function fmtK(v) {
  const n = Number(v) || 0
  return n >= 1000 ? `₪${Math.round(n / 1000)}K` : `₪${n}`
}

function annualRealismIssues(annual, starting) {
  const baseMonthly = Number(starting.avgMonthlyRevenue) || 0
  const target = Number(annual.revenueTarget) || 0
  if (!baseMonthly || !target) return []
  const baseAnnual = baseMonthly * 12
  const growthX = target / baseAnnual
  if (growthX >= 5) return [{ level: 'red',
    msg: `יעד שנתי (${fmtK(target)}) גבוה פי ${growthX.toFixed(1)} מהכנסתך השנתית הנוכחית (${fmtK(baseAnnual)}). קפיצה כזו בשנה אחת — נדירה מאוד. ודא שהיעד ריאלי.` }]
  if (growthX >= 2.5) return [{ level: 'amber',
    msg: `יעד שנתי גבוה פי ${growthX.toFixed(1)} מהבסיס — אפשרי, אבל נדרשים שינויים עמוקים בעסק, לא רק עוד מאמץ.` }]
  return []
}

function quarterlyRealismIssues(quarterly, annual, starting) {
  const issues = []
  const baseMonthly = Number(starting.avgMonthlyRevenue) || 0
  const baseQ = baseMonthly * 3
  const qTarget = Number(quarterly.revenueTarget) || 0
  const annualTarget = Number(annual.revenueTarget) || 0

  if (baseQ > 0 && qTarget > 0) {
    const gx = qTarget / baseQ
    if (gx >= 4) issues.push({ level: 'red',
      msg: `יעד רבעוני (${fmtK(qTarget)}) גבוה פי ${gx.toFixed(1)} מהבסיס (${fmtK(baseQ)}). בדוק שהיעד ריאלי.` })
    else if (gx >= 2.5) issues.push({ level: 'amber',
      msg: `קפיצה פי ${gx.toFixed(1)} מהבסיס הרבעוני — אפשרי, אבל נדרש שינוי אסטרטגי ממשי.` })
  }

  if (annualTarget > 0 && qTarget > 0) {
    const implied = qTarget * 4
    const ratio = implied / annualTarget
    if (ratio > 1.4) issues.push({ level: 'amber',
      msg: `4 רבעונים כאלו → ${fmtK(implied)} לשנה — ${Math.round(ratio * 100 - 100)}% מעל היעד השנתי שלך (${fmtK(annualTarget)}). שקול לאזן את אחד מהשניים.` })
  }

  return issues
}

function monthlyRealismIssues(monthly, quarterly, starting) {
  const issues = []
  const baseMonthly = Number(starting.avgMonthlyRevenue) || 0
  const closingRate = (Number(starting.closingRate) || 0) / 100
  const mTarget = Number(monthly.revenueTarget) || 0
  const qTarget = Number(quarterly.revenueTarget) || 0
  const mLeads = Number(monthly.leadsTarget) || 0
  const mCalls = Number(monthly.callsTarget) || 0

  if (baseMonthly > 0 && mTarget > 0) {
    const gx = mTarget / baseMonthly
    if (gx >= 5) issues.push({ level: 'red',
      msg: `יעד חודשי (${fmtK(mTarget)}) גבוה פי ${gx.toFixed(1)} מהבסיס שלך (${fmtK(baseMonthly)}). קפיצה כזו בחודש אחד — בדוק שהיעד ריאלי.` })
    else if (gx >= 3) issues.push({ level: 'amber',
      msg: `קפיצה פי ${gx.toFixed(1)} מהבסיס — אפשרי, אבל נדרש שינוי אסטרטגי, לא רק עוד מאמץ.` })
  }

  if (qTarget > 0 && mTarget > 0) {
    const ratio = mTarget / (qTarget / 3)
    if (ratio > 1.6) issues.push({ level: 'amber',
      msg: `יעד חודשי גבוה ב-${Math.round(ratio * 100 - 100)}% מהצפוי לפי הרבעון (${fmtK(Math.round(qTarget / 3))} לחודש). שקול לאזן.` })
  }

  if (mLeads > 0 && mCalls > 0 && mCalls > mLeads * 1.2) {
    issues.push({ level: 'red',
      msg: `יעד שיחות (${mCalls}) חורג מיעד לידים (${mLeads}). לא ניתן לקיים יותר שיחות מכירה ממה שיש לידים.` })
  }

  if (mCalls > 0 && closingRate > 0) {
    const expected = Math.round(mCalls * closingRate)
    const closures = Math.round(mTarget / Math.max(baseMonthly / Math.max(Number(starting.monthlyCalls) || 1, 1), 1))
    // Only flag if we can compute a meaningful implied closures
    if (Number(starting.closingRate) > 0 && expected > 0 && closures > expected * 1.5 && closures > 0) {
      issues.push({ level: 'amber',
        msg: `לפי אחוז הסגירה שלך (${starting.closingRate}%), מ-${mCalls} שיחות צפויות ~${expected} סגירות — וודא שהיעד תואם.` })
    }
  }

  return issues
}

// ─── Realism alert display ────────────────────────────────────────────────────

function SetupRealismAlert({ issues }) {
  if (!issues.length) return null
  const isRed = issues.some(i => i.level === 'red')
  const cls = isRed
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-amber-50 border-amber-200 text-amber-700'
  return (
    <div className={`rounded-xl border p-3 space-y-1.5 ${cls}`}>
      <p className="text-xs font-black uppercase tracking-wide">{isRed ? '🚨' : '⚠️'} בדיקת ריאליות</p>
      {issues.map((issue, i) => (
        <p key={i} className="text-xs leading-relaxed">{issue.msg}</p>
      ))}
      <p className="text-[11px] opacity-60 pt-0.5">ניתן להמשיך — ההתרעה אינה חוסמת שמירה</p>
    </div>
  )
}

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ data, setData }) {
  const [touched, setTouched] = useState({ name: false, email: false })

  const nameError  = touched.name  && data.name.trim().length < 2  ? 'שם חייב להכיל לפחות 2 תווים' : ''
  const emailError = touched.email && !EMAIL_RE.test(data.email)    ? 'כתובת אימייל לא תקינה'        : ''

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">👋</div>
        <h2 className="text-xl font-black text-slate-900">שמחים שאתה כאן</h2>
        <p className="text-sm text-slate-500 mt-1">ספר לנו קצת עליך — 30 שניות</p>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-slate-700">שם מלא</label>
        <input
          type="text"
          value={data.name}
          onChange={e => setData(d => ({ ...d, name: e.target.value }))}
          onBlur={() => setTouched(t => ({ ...t, name: true }))}
          placeholder="ניב בלי"
          className={`w-full text-sm text-slate-800 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-300 ${nameError ? 'border-red-400' : 'border-slate-200'}`}
        />
        {nameError && <p className="text-xs text-red-500">{nameError}</p>}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-slate-700">אימייל</label>
        <p className="text-xs text-slate-400 leading-relaxed">ישמש לזיהוי שלך בדשבורד המנהל</p>
        <input
          type="email"
          value={data.email}
          onChange={e => setData(d => ({ ...d, email: e.target.value }))}
          onBlur={() => setTouched(t => ({ ...t, email: true }))}
          placeholder="niv@example.com"
          className={`w-full text-sm text-slate-800 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-300 ${emailError ? 'border-red-400' : 'border-slate-200'}`}
        />
        {emailError && <p className="text-xs text-red-500">{emailError}</p>}
      </div>

      <Input label="שם העסק / מותג" placeholder="הפסגה, NivFit..."
        value={data.businessName} onChange={v => setData(d => ({ ...d, businessName: v }))} />
    </div>
  )
}

function Step2({ data, setData }) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">📍</div>
        <h2 className="text-xl font-black text-slate-900">נקודת ההתחלה</h2>
        <p className="text-sm text-slate-500 mt-1">ממה אנחנו מתחילים — הבסיס שממנו נמדוד צמיחה</p>
      </div>

      <CurrencyInput label="הכנסה חודשית ממוצעת (3 חודשים אחרונים)"
        hint="הכנסות ברוטו בפועל — לא יעד, לא שאיפה"
        value={data.avgMonthlyRevenue}
        onChange={v => setData(d => ({ ...d, avgMonthlyRevenue: v }))} />

      <div className="grid grid-cols-2 gap-4">
        <Input label="לידים בחודש" type="number" placeholder="20"
          value={data.monthlyLeads} onChange={v => setData(d => ({ ...d, monthlyLeads: Number(v) }))} />
        <Input label="שיחות מכירה בחודש" type="number" placeholder="8"
          value={data.monthlyCalls} onChange={v => setData(d => ({ ...d, monthlyCalls: Number(v) }))} />
      </div>

      <Input label="אחוז סגירה (%)" type="number" placeholder="40"
        hint="מכמה שיחות אתה סוגר בממוצע"
        value={data.closingRate} onChange={v => setData(d => ({ ...d, closingRate: Number(v) }))} />

      <div className="grid grid-cols-2 gap-4">
        <Input label="חודשי מסלול (Runway)" type="number" placeholder="3"
          hint="כמה חודשים העסק יכול להחזיק ללא הכנסות?"
          value={data.runwayMonths} onChange={v => setData(d => ({ ...d, runwayMonths: Number(v) }))} />
        <CurrencyInput label="מזומן / חיסכון פנוי"
          hint="כמה כסף זמין יש לך כרגע?"
          value={data.freeCashAmount}
          onChange={v => setData(d => ({ ...d, freeCashAmount: v }))} />
      </div>

      <div className="space-y-4 pt-1">
        <SliderInput label="ביטחון עצמי עסקי (1–10)"
          hint="1 = חסר ביטחון, 10 = מוכן לכל"
          value={data.confidence} onChange={v => setData(d => ({ ...d, confidence: v }))} />
        <SliderInput label="בהירות לגבי הכיוון (1–10)"
          hint="1 = לא יודע לאן, 10 = מאוד ברור"
          value={data.clarity} onChange={v => setData(d => ({ ...d, clarity: v }))} />
      </div>

      {/* Blocking patterns — replaces single whereStuck textarea */}
      <SetupBlockingPatterns
        patterns={data.blockingPatterns}
        onChange={arr => setData(d => ({ ...d, blockingPatterns: arr }))}
      />
    </div>
  )
}

function Step3({ data, setData, starting }) {
  const issues = annualRealismIssues(data, starting)
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🎯</div>
        <h2 className="text-xl font-black text-slate-900">חזון שנתי</h2>
        <p className="text-sm text-slate-500 mt-1">לאן אנחנו הולכים עד סוף השנה</p>
      </div>

      <CurrencyInput label="יעד הכנסות שנתי"
        hint="מה סך ההכנסות שתרצה להגיע אליו השנה?"
        value={data.revenueTarget}
        onChange={v => setData(d => ({ ...d, revenueTarget: v }))} />

      <SetupRealismAlert issues={issues} />

      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-slate-700">זהות — מי אתה כשאתה על הפסגה?</label>
        <p className="text-xs text-slate-400">משפט אחד שמגדיר את הגרסה הטובה ביותר שלך</p>
        <textarea rows={2} value={data.identity}
          onChange={e => setData(d => ({ ...d, identity: e.target.value }))}
          placeholder="לדוגמה: מנהיג שמשנה חיים — ממושמע, נוכח, מקצועי ברמה הגבוהה ביותר"
          className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-200" />
      </div>

      <Input label="יעד קהילה / עוקבים (אופציונלי)"
        hint="מספר עוקבים, רשימת תפוצה, או כל KPI רלוונטי אחר"
        placeholder="לדוגמה: 10,000 עוקבים"
        value={data.communityTarget}
        onChange={v => setData(d => ({ ...d, communityTarget: v }))} />
    </div>
  )
}

function Step4({ data, setData, period, starting, annual }) {
  const currentQ = period.quarter || 'Q2'
  const issues = quarterlyRealismIssues(data, annual, starting)
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">📅</div>
        <h2 className="text-xl font-black text-slate-900">יעדי {currentQ}</h2>
        <p className="text-sm text-slate-500 mt-1">3 המהלכים הגדולים של הרבעון הזה</p>
      </div>

      <CurrencyInput label={`יעד הכנסות ל-${currentQ}`}
        hint="יעד רבעוני — חלק את השנתי ב-4 כנקודת התחלה"
        value={data.revenueTarget}
        onChange={v => setData(d => ({ ...d, revenueTarget: v }))} />

      <SetupRealismAlert issues={issues} />

      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-700">3 מהלכים מרכזיים לרבעון</label>
        <p className="text-xs text-slate-400">מה שלושת הצעדים הגדולים שיזיזו את העסק קדימה?</p>
        {[0, 1, 2].map(i => (
          <KeyMoveInput key={i} index={i}
            value={data.threeKeyMoves[i] || ''}
            onChange={v => setData(d => {
              const moves = [...d.threeKeyMoves]; moves[i] = v
              return { ...d, threeKeyMoves: moves }
            })} />
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-slate-700">הרגל ליבה לרבעון</label>
        <input type="text" value={data.habit}
          onChange={e => setData(d => ({ ...d, habit: e.target.value }))}
          placeholder="לדוגמה: שיחת מכירה אחת בכל יום עסקי"
          className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-300" />
      </div>
    </div>
  )
}

function Step5({ data, setData, period, starting, quarterly }) {
  const currentMonth = period.month || 'החודש'
  const issues = monthlyRealismIssues(data, quarterly, starting)
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🗓</div>
        <h2 className="text-xl font-black text-slate-900">יעדי {currentMonth}</h2>
        <p className="text-sm text-slate-500 mt-1">המיקוד לחודש הזה ספציפית</p>
      </div>

      <CurrencyInput label={`יעד הכנסות ל${currentMonth}`}
        hint="כמה כסף אתה מתחייב להביא החודש?"
        value={data.revenueTarget}
        onChange={v => setData(d => ({ ...d, revenueTarget: v }))} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="יעד לידים" type="number" placeholder="20"
          value={data.leadsTarget} onChange={v => setData(d => ({ ...d, leadsTarget: Number(v) }))} />
        <Input label="יעד שיחות מכירה" type="number" placeholder="8"
          value={data.callsTarget} onChange={v => setData(d => ({ ...d, callsTarget: Number(v) }))} />
      </div>

      <SetupRealismAlert issues={issues} />

      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-700">3 מהלכים מרכזיים לחודש</label>
        <p className="text-xs text-slate-400">מה שלושת הדברים שאם תעשה אותם — החודש יהיה הצלחה?</p>
        {[0, 1, 2].map(i => (
          <KeyMoveInput key={i} index={i}
            value={data.threeKeyMoves[i] || ''}
            onChange={v => setData(d => {
              const moves = [...d.threeKeyMoves]; moves[i] = v
              return { ...d, threeKeyMoves: moves }
            })} />
        ))}
      </div>
    </div>
  )
}

function StepDone({ name, onCreateTasks }) {
  const firstName = name?.split(' ')[0] || 'יזם'
  const [titles,  setTitles]  = useState(['', '', ''])
  const [created, setCreated] = useState(false)

  function setTitle(i, v) {
    setTitles(prev => { const n = [...prev]; n[i] = v; return n })
  }

  function handleCreate() {
    const valid = titles.filter(t => t.trim())
    if (!valid.length) return
    onCreateTasks(valid)
    setCreated(true)
  }

  const PLACEHOLDERS = [
    'לדוגמה: לסגור 2 עסקאות השבוע',
    'לדוגמה: לשלוח הצעת מחיר ל-3 לידים',
    'לדוגמה: לפרסם פוסט מכירה בסטוריז',
  ]

  return (
    <div className="space-y-5">
      {/* Celebration header */}
      <div className="text-center">
        <div className="text-6xl mb-3">🏆</div>
        <h2 className="text-2xl font-black text-slate-900">מוכן, {firstName}!</h2>
        <p className="text-sm text-slate-500 mt-1">FlowOS מוכן. שניה אחת לפני שנכנסים —</p>
      </div>

      {!created ? (
        <div className="space-y-3">
          {/* Prompt card */}
          <div className="bg-gradient-to-l from-brand-50 to-indigo-50 border border-brand-100 rounded-xl p-3.5">
            <p className="text-sm font-black text-brand-800">🎯 מה 3 המשימות שלך לשבוע הזה?</p>
            <p className="text-xs text-brand-500 mt-0.5">תוסיף עכשיו — תגמור 10× יותר</p>
          </div>

          {/* Task inputs */}
          {titles.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-black flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <input
                value={t}
                onChange={e => setTitle(i, e.target.value)}
                onKeyDown={e => e.key === 'Enter' && i < 2 && document.querySelectorAll('.task-input')[i + 1]?.focus()}
                placeholder={PLACEHOLDERS[i]}
                className="task-input flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          ))}

          <button
            onClick={handleCreate}
            disabled={!titles.some(t => t.trim())}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-black rounded-xl transition-colors"
          >
            צור משימות ↵
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-2">
          <div className="text-3xl">✅</div>
          <p className="text-sm font-black text-green-700">
            {titles.filter(t => t.trim()).length} משימות נוצרו בלוח שלך
          </p>
          <p className="text-xs text-green-500">מוכן לצאת לדרך!</p>
        </div>
      )}
    </div>
  )
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

const STEPS = [
  { title: 'פרטים אישיים' },
  { title: 'נקודת התחלה' },
  { title: 'חזון שנתי' },
  { title: 'יעדי רבעון' },
  { title: 'יעדי חודש' },
]

export default function Setup() {
  const { completeSetup, addTask } = useStore()
  const navigate = useNavigate()
  const period   = usePeriod()

  // Restore draft on mount (survives accidental refresh)
  const draft = useMemo(loadDraft, [])

  const [step, setStep] = useState(draft?.step ?? 0)

  const [personal,  setPersonal]  = useState(draft?.personal ?? { name: '', email: '', businessName: '' })
  const [starting,  setStarting]  = useState(draft?.starting ?? {
    avgMonthlyRevenue: '', monthlyLeads: '', monthlyCalls: '',
    closingRate: '', runwayMonths: '', freeCashAmount: '',
    confidence: 7, clarity: 7,
    blockingPatterns: [''],
  })
  const [annual,    setAnnual]    = useState(draft?.annual    ?? { revenueTarget: '', identity: '', communityTarget: '' })
  const [quarterly, setQuarterly] = useState(draft?.quarterly ?? { revenueTarget: '', threeKeyMoves: ['', '', ''], habit: '' })
  const [monthly,   setMonthly]   = useState(draft?.monthly   ?? { revenueTarget: '', leadsTarget: '', callsTarget: '', threeKeyMoves: ['', '', ''] })

  // Auto-save draft on every state change (not on step=5 — that's the done screen)
  useEffect(() => {
    if (step === 0 && !personal.name && !personal.email) return // skip empty first open
    if (step < 5) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, personal, starting, annual, quarterly, monthly }))
    }
  }, [step, personal, starting, annual, quarterly, monthly])

  const isLast  = step === STEPS.length
  const canNext = step === 0
    ? (personal.name.trim().length >= 2 && EMAIL_RE.test(personal.email))
    : true

  function handleNext() { if (step < STEPS.length) setStep(s => s + 1) }
  function handleBack()  { setStep(s => Math.max(0, s - 1)) }

  // Quick Start: create first tasks from StepDone UI
  function handleCreateTasks(taskTitles) {
    taskTitles.forEach((title, i) => {
      addTask({
        title:    title.trim(),
        status:   'week',
        priority: i === 0 ? 'high' : 'medium',
        isBigThree: i < 3,
      })
    })
  }

  function handleFinish() {
    const now = new Date().toISOString()
    localStorage.removeItem(DRAFT_KEY)   // clear draft — setup complete

    // Clean up blockingPatterns: filter empty strings
    const cleanPatterns = (starting.blockingPatterns || []).filter(p => p.trim())

    const profileData = {
      email:        personal.email.trim().toLowerCase() || 'user@flowos.app',
      name:         personal.name.trim(),
      businessName: personal.businessName.trim(),
      startDate:    now,
      startingPoint: {
        avgMonthlyRevenue: Number(starting.avgMonthlyRevenue) || 0,
        monthlyLeads:      Number(starting.monthlyLeads)      || 0,
        monthlyCalls:      Number(starting.monthlyCalls)      || 0,
        closingRate:       Number(starting.closingRate)        || 0,
        runwayMonths:      Number(starting.runwayMonths)       || 0,
        freeCashAmount:    Number(starting.freeCashAmount)     || 0,
        confidence:        starting.confidence,
        clarity:           starting.clarity,
        blockingPatterns:  cleanPatterns,
      },
      annualGoals: {
        revenueTarget:   Number(annual.revenueTarget) || 0,
        identity:        annual.identity.trim(),
        communityTarget: annual.communityTarget.trim(),
      },
    }

    const quarterlyData = {
      quarter:       period.quarter || 'Q2',
      year:          new Date().getFullYear(),
      status:        'active',
      revenueTarget: Number(quarterly.revenueTarget) || 0,
      threeKeyMoves: quarterly.threeKeyMoves,
      habit:         quarterly.habit.trim(),
    }

    const monthlyData = {
      month:         period.month,
      year:          new Date().getFullYear(),
      quarter:       period.quarter || 'Q2',
      status:        'active',
      revenueTarget: Number(monthly.revenueTarget) || 0,
      leadsTarget:   Number(monthly.leadsTarget)   || 0,
      callsTarget:   Number(monthly.callsTarget)   || 0,
      threeKeyMoves: monthly.threeKeyMoves,
    }

    completeSetup({ profile: profileData, quarterly: quarterlyData, monthly: monthlyData })

    // Register coach in Supabase — fire-and-forget, never blocks setup
    upsertCoach({
      email:         profileData.email,
      name:          profileData.name,
      track:         'ליווי',
      status:        'active',
      start_date:    new Date().toISOString().split('T')[0],
      annual_goals:  profileData.annualGoals,
      starting_point: profileData.startingPoint,
    })

    navigate('/weekly', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-8" dir="rtl">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900">FlowOS</h1>
          <p className="text-xs text-slate-400 mt-1">מערכת ניהול ביצוע ליזמים</p>
        </div>

        {/* Progress bar */}
        {!isLast && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">{STEPS[step]?.title}</span>
              <span className="text-xs text-slate-400">{step + 1} / {STEPS.length}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <div className="overflow-y-auto max-h-[65vh] pr-1">
            {step === 0 && <Step1 data={personal}  setData={setPersonal} />}
            {step === 1 && <Step2 data={starting}  setData={setStarting} />}
            {step === 2 && <Step3 data={annual}    setData={setAnnual}    starting={starting} />}
            {step === 3 && <Step4 data={quarterly} setData={setQuarterly} period={period} starting={starting} annual={annual} />}
            {step === 4 && <Step5 data={monthly}   setData={setMonthly}   period={period} starting={starting} quarterly={quarterly} />}
            {step === 5 && <StepDone name={personal.name} onCreateTasks={handleCreateTasks} />}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
            {step > 0 && !isLast && (
              <button onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-4 h-4" /> חזרה
              </button>
            )}
            {step < STEPS.length && (
              <button onClick={handleNext} disabled={!canNext}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-colors">
                {step === STEPS.length - 1 ? 'סיום →' : <>הבא <ChevronLeft className="w-4 h-4" /></>}
              </button>
            )}
            {step === STEPS.length && (
              <button onClick={handleFinish}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-black bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors">
                <Check className="w-4 h-4" /> כניסה ל-FlowOS
              </button>
            )}
          </div>

          {step > 0 && step < STEPS.length && (
            <p className="text-center text-xs text-slate-400 mt-3">
              <button onClick={handleNext} className="hover:text-slate-600 underline">
                דלג — אמלא אחר כך
              </button>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          כל הנתונים נשמרים מקומית בדפדפן שלך בלבד
        </p>
      </div>
    </div>
  )
}
