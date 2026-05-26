/**
 * Admin — Coach Dashboard.
 * Per trainee: status, score, Big 3 visual, KPI bars, stuck/ghost flags,
 * task-level summary (from flowos_weekly_summaries), data-driven opener.
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import TopBar from '../../components/layout/TopBar.jsx'
import { useData } from '../../hooks/useData.js'
import { getLatestWeek } from '../../data/raw.js'
import { calcWeeklyScore } from '../../utils/scoring.js'
import { getAdminStatus, getStatusColors, daysSinceUpdate } from '../../utils/status.js'
import { getConversationOpener } from '../../utils/actionEngine.js'
import { formatCurrency } from '../../utils/formatters.js'
import { getFlowBrainState } from '../../utils/flowBrain.js'
import { fetchCoaches, fetchCoachSummaries, fetchAllWeeklyForms, fetchAllTraineeTasks, upsertCoach, sendCoachPush, supabase } from '../../lib/supabase.js'

const STATUS_ORDER = { red: 0, yellow: 1, green: 2, gray: 3 }

// 🔑 קוד גישה לדשבורד המלווה — שנה לקוד שאתה בוחר
const ADMIN_PIN = '1818'

// Read current user email fresh from localStorage each call (avoids stale module value)
function getCurrentUserEmail() {
  try {
    const p = JSON.parse(localStorage.getItem('flowos_profile') || '{}')
    return p.email || 'niv@flowos.app'
  } catch { return 'niv@flowos.app' }
}

// ─── PIN Gate ─────────────────────────────────────────────────────────────────
function PinGate({ onUnlock }) {
  const [pin,   setPin]   = useState('')
  const [error, setError] = useState(false)

  function tryUnlock(value) {
    if (value === ADMIN_PIN) {
      sessionStorage.setItem('flowos_admin_auth', '1')
      onUnlock()
    } else {
      setError(true)
      setPin('')
      setTimeout(() => setError(false), 1500)
    }
  }

  function handleChange(e) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(v)
    if (v.length === 4) tryUnlock(v)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && pin.length === 4) tryUnlock(pin)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900" dir="rtl">
      <div className="text-center space-y-6 px-8">
        <div className="text-5xl mb-2">🔐</div>
        <h2 className="text-2xl font-black text-white">דשבורד מלווים</h2>
        <p className="text-sm text-slate-400">הזן קוד גישה להמשך</p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={handleChange}
          onKeyDown={handleKey}
          maxLength={4}
          autoFocus
          className={[
            'w-36 text-center text-3xl font-black tracking-[0.4em] border-2 rounded-2xl px-4 py-3 bg-slate-800 text-white focus:outline-none transition-colors',
            error ? 'border-red-500' : 'border-slate-600 focus:border-brand-400',
          ].join(' ')}
          placeholder="••••"
        />
        {error && (
          <p className="text-sm text-red-400 font-bold animate-bounce">קוד שגוי — נסה שוב</p>
        )}
        <p className="text-[11px] text-slate-600 pt-2">FlowOS Coach Dashboard</p>
      </div>
    </div>
  )
}

const FILTERS = [
  { key: 'all',    label: 'הכל' },
  { key: 'red',    label: '🔴 מאחור' },
  { key: 'yellow', label: '🟡 לעקוב' },
  { key: 'green',  label: '🟢 בקצב' },
]

// ─── Coach Push Form ──────────────────────────────────────────────────────────
// Inline expandable form inside TraineeCard. Writes to flowos_coach_push via Supabase.
function CoachPushForm({ traineeName, traineeEmail }) {
  const [open,      setOpen]      = useState(false)
  const [message,   setMessage]   = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [sent,      setSent]      = useState(false)
  const [sending,   setSending]   = useState(false)
  const [error,     setError]     = useState(null)

  const first = traineeName?.split(' ')[0] || ''

  const QUICK = [
    { label: '🔴 תסגור את Big 3 היום',   msg: `תסגור את ה-Big 3 שלך היום — זה המהלך שמזיז הכל.` },
    { label: '⚡ אל תאחר יותר',            msg: 'אתה מאחור — זה הזמן לזוז. בחר משימה אחת וסיים אותה עכשיו.' },
    { label: '💬 בוא נדבר',               msg: 'יש לי תצפיות מהשבוע. בוא נקבע שיחה של 15 דקות.' },
  ]

  async function handleSend() {
    if (!message.trim() || sending) return
    setSending(true)
    setError(null)
    const ok = await sendCoachPush({
      fromEmail: getCurrentUserEmail(),
      toEmail:   traineeEmail,
      message:   message.trim(),
      taskTitle: taskTitle.trim() || null,
    })
    setSending(false)
    if (ok) {
      setSent(true)
      setTimeout(() => { setSent(false); setOpen(false); setMessage(''); setTaskTitle('') }, 1800)
    } else {
      setError('שגיאה בשליחה — נסה שוב')
    }
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="w-full text-xs font-bold py-2 rounded-xl border border-brand-200 text-brand-600 hover:bg-brand-50 transition-colors"
    >
      📨 שלח דחיפה ל{first}
    </button>
  )

  return (
    <div className="border border-brand-200 rounded-xl p-3 space-y-2 bg-brand-50">
      <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">שלח דחיפה</p>

      {/* Quick options */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map(q => (
          <button key={q.label}
            onClick={() => setMessage(q.msg)}
            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
              message === q.msg
                ? 'bg-brand-600 text-white border-brand-600'
                : 'border-brand-200 text-brand-600 hover:bg-brand-100'
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Custom message */}
      <textarea
        rows={2}
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={`הודעה ל${first}...`}
        className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-300"
      />

      {/* Optional task reference */}
      <input
        value={taskTitle}
        onChange={e => setTaskTitle(e.target.value)}
        placeholder="שם משימה ספציפית (אופציונלי)"
        className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-300"
      />

      {error && (
        <p className="text-[10px] text-red-500 font-semibold">{error}</p>
      )}
      <div className="flex gap-2">
        {sent ? (
          <div className="flex-1 text-center text-xs font-black text-green-600 py-1.5">✓ נשלח!</div>
        ) : (
          <>
            <button onClick={handleSend} disabled={!message.trim() || sending || !traineeEmail}
              className="flex-1 text-xs font-bold py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-colors">
              {sending ? '...' : 'שלח'}
            </button>
            <button onClick={() => { setOpen(false); setError(null) }}
              className="px-3 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl transition-colors text-xs">
              ביטול
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Load latest weekly summary from localStorage ─────────────────────────────
function loadLatestSummary() {
  try {
    const arr = JSON.parse(localStorage.getItem('flowos_weekly_summaries') || '[]')
    return arr[0] || null
  } catch { return null }
}

// ─── Completion ring ──────────────────────────────────────────────────────────
function CompletionRing({ pct }) {
  const r = 20, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444'
  return (
    <svg width="52" height="52" className="shrink-0 -rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      <text x="26" y="26" textAnchor="middle" dominantBaseline="middle"
        className="rotate-90" style={{ fontSize: 11, fontWeight: 900, fill: color, transform: 'rotate(90deg)', transformOrigin: '26px 26px' }}>
        {pct}%
      </text>
    </svg>
  )
}

// ─── Big 3 Dots ───────────────────────────────────────────────────────────────
function Big3Dots({ done = 0, total = 3 }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i}
          className={`w-3 h-3 rounded-full border-2 transition-colors ${
            i < done ? 'bg-purple-500 border-purple-500' : 'bg-transparent border-slate-300'
          }`}
          title={i < done ? `מהלך ${i + 1} — בוצע` : `מהלך ${i + 1} — לא בוצע`}
        />
      ))}
      <span className="text-xs font-bold text-slate-500 mr-1">{done}/{total}</span>
    </div>
  )
}

// ─── KPI Bar ──────────────────────────────────────────────────────────────────
function KpiBar({ label, actual, target, format }) {
  if (!target) return null
  const pct   = Math.min(100, Math.round((actual / target) * 100))
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[10px] text-slate-500 font-medium">{label}</span>
        <span className="text-[10px] font-bold text-slate-700">
          {format(actual)} <span className="text-slate-400 font-normal">/ {format(target)}</span>
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Task Summary Strip (from flowos_weekly_summaries) ───────────────────────
function TaskSummaryStrip({ summary }) {
  if (!summary) return null
  const { completionPct = 0, stuckCount = 0, noGoalCount = 0, big3Done = 0, big3Total = 3, weekLabel, score } = summary
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-red-500'
  const scoreBg    = score >= 80 ? 'bg-green-50 border-green-200' : score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  return (
    <div className="border border-slate-100 rounded-xl p-3 mb-3 bg-slate-50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          📋 Task Manager · {weekLabel}
        </div>
        {score != null && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-black ${scoreBg} ${scoreColor}`}>
            ⭐ {score}
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: '% ביצוע',   value: `${completionPct}%`,    color: completionPct >= 70 ? 'text-green-600' : 'text-amber-600' },
          { label: 'Big 3',     value: `${big3Done}/${big3Total}`, color: big3Done >= 2 ? 'text-brand-600' : 'text-red-500' },
          { label: '📌 תקועות', value: stuckCount,             color: stuckCount > 0 ? 'text-red-500' : 'text-green-600' },
          { label: '⚠ ללא יעד', value: noGoalCount,            color: noGoalCount > 0 ? 'text-amber-600' : 'text-green-600' },
        ].map(m => (
          <div key={m.label}>
            <div className={`text-base font-black ${m.color}`}>{m.value}</div>
            <div className="text-[9px] text-slate-400 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Build a personalized opener from summary data ────────────────────────────
function buildOpener({ name, status, score, big3done, daysSince, week, summary }) {
  const first = name ? name.split(' ')[0] : ''
  const prefix = first ? `${first}, ` : ''

  // Use summary data when available for maximum specificity
  if (summary) {
    const { completionPct = 0, stuckCount = 0, noGoalCount = 0, big3Done = 0 } = summary
    if (noGoalCount >= 4) {
      return `${prefix}ראיתי ${summary.totalTasks} משימות אבל ${noGoalCount} מהן לא מחוברות ליעד. בוא ננקה רעש קודם.`
    }
    if (stuckCount > 0 && big3Done < 2) {
      return `${prefix}יש ${stuckCount} משימות תקועות ו-Big 3 לא הושלם. בוא נפתור את החסם לפני הכל.`
    }
    if (stuckCount > 0) {
      return `${prefix}${stuckCount} משימות תקועות בביצוע — מה עוצר? בוא נחליט: לסגור, לפרק, או לבטל.`
    }
    if (noGoalCount > 0 && completionPct < 50) {
      return `${prefix}${completionPct}% ביצוע ו-${noGoalCount} משימות ללא יעד — הרעש מונע מהגדולים.`
    }
    if (completionPct >= 70 && big3Done >= 2) {
      return `${prefix}${completionPct}% ביצוע + Big 3 כמעט מלא — שבוע חזק! מה המהלך הבא?`
    }
  }

  // Fallback to the enriched getConversationOpener
  return getConversationOpener({ status, score, big3done, daysSince, week, name })
}

// ─── Trainee Card ─────────────────────────────────────────────────────────────
// ─── Live Task Stats Strip — shown when Supabase tasks exist ─────────────────
function LiveTaskStrip({ stats }) {
  if (!stats || stats.total === 0) return null
  const donePct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">משימות חיות</span>
        <span className="text-[10px] font-bold text-slate-500">{stats.done}/{stats.total} בוצעו ({donePct}%)</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {stats.doing > 0 && (
          <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
            ⚡ {stats.doing} בביצוע
          </span>
        )}
        {stats.active > 0 && (
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
            📋 {stats.active} פעילות
          </span>
        )}
        {stats.big3 > 0 && (
          <span className="text-[10px] font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-100">
            ★ {stats.big3} Big3
          </span>
        )}
        {stats.backlog > 0 && (
          <span className="text-[10px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
            {stats.backlog} ב-backlog
          </span>
        )}
      </div>
      {/* Progress bar */}
      <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-400 to-green-400 rounded-full transition-all duration-500"
          style={{ width: `${donePct}%` }} />
      </div>
    </div>
  )
}

function TraineeCard({ trainee, summary, taskStats }) {
  const { name, week, status, score } = trainee
  const colors = getStatusColors(status)
  const days   = daysSinceUpdate(week?.filledAt)
  const big3   = week?.bigThreeCompleted || 0

  const isStuck = days >= 3 && status !== 'green' && days !== Infinity
  const isGhost = days === Infinity || days > 10

  // KPI completion avg (for ring)
  const kpiPct = useMemo(() => {
    if (!week) return 0
    const checks = [
      week.targetsRevenue  ? (week.revenue  || 0) / week.targetsRevenue  : null,
      week.targetsLeads    ? (week.leads    || 0) / week.targetsLeads    : null,
      week.targetsCalls    ? (week.calls    || 0) / week.targetsCalls    : null,
      week.targetsClosures ? (week.closures || 0) / week.targetsClosures : null,
    ].filter(v => v !== null)
    if (!checks.length) return 0
    return Math.min(100, Math.round(checks.reduce((s, v) => s + v, 0) / checks.length * 100))
  }, [week])

  // Brain state — derive from week data (admin view, no localStorage tasks)
  const brain = useMemo(() => {
    if (!week) return null
    // Build synthetic tasks array from summary data if available
    const syntheticTasks = []
    if (summary) {
      // Populate enough tasks to drive mode detection
      for (let i = 0; i < (summary.big3Done || 0); i++) {
        syntheticTasks.push({ id: `b3d${i}`, isBigThree: true, status: 'done', priority: 'high' })
      }
      for (let i = 0; i < ((summary.big3Total || 3) - (summary.big3Done || 0)); i++) {
        syntheticTasks.push({ id: `b3o${i}`, isBigThree: true, status: 'today', priority: 'high' })
      }
      for (let i = 0; i < (summary.stuckCount || 0); i++) {
        const updatedAt = new Date(Date.now() - 4 * 3_600_000).toISOString()
        syntheticTasks.push({ id: `sk${i}`, isBigThree: false, status: 'doing', priority: 'medium', updatedAt })
      }
    }
    const monthly = week.targetsRevenue ? { revenueTarget: week.targetsRevenue } : null
    return getFlowBrainState({ monthly, tasks: syntheticTasks })
  }, [week, summary])

  const opener = buildOpener({
    name, status, score: score?.score, big3done: big3,
    daysSince: days === Infinity ? 999 : days,
    week, summary,
  })

  const statusLabel = status === 'green' ? 'בקצב' : status === 'yellow' ? 'לעקוב' : status === 'red' ? 'מאחור' : 'חסר מידע'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: colors.hex }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {week && <CompletionRing pct={kpiPct} />}
            <div>
              <div className="font-black text-slate-900 text-base leading-tight">{name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {isGhost ? '⚠️ לא עדכן מעולם' : days === 0 ? '✅ עדכן היום' : `עדכן לפני ${days} ${days === 1 ? 'יום' : 'ימים'}`}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Big3Dots done={big3} total={3} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{ backgroundColor: colors.bg, color: colors.text }}>
              {statusLabel}
            </span>
            {week && (
              <span className="text-2xl font-black tabular-nums" style={{ color: colors.hex }}>
                {score?.score ?? '—'}
              </span>
            )}
          </div>
        </div>

        {/* Ghost / Stuck alert */}
        {isGhost && (
          <div className="flex items-center gap-2 bg-slate-900 text-white rounded-xl px-3 py-2 mb-3 text-xs font-semibold">
            <span>👻</span><span>לא הגיש שבועי — נדרשת פנייה ישירה</span>
          </div>
        )}
        {!isGhost && isStuck && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3 text-xs font-semibold text-amber-800">
            <span>📌</span><span>תקוע {days} {days === 1 ? 'יום' : 'ימים'} — בדוק מה עוצר</span>
          </div>
        )}

        {/* Live task stats from Supabase (real-time) */}
        <LiveTaskStrip stats={taskStats} />

        {/* Task Manager summary (if exists for this user) */}
        <TaskSummaryStrip summary={summary} />

        {/* KPI bars */}
        {week ? (
          <div className="space-y-2 mb-3">
            <KpiBar label="💰 הכנסות" actual={week.revenue || 0}  target={week.targetsRevenue}  format={formatCurrency} />
            <KpiBar label="📞 שיחות"  actual={week.calls   || 0}  target={week.targetsCalls}    format={v => `${v} שיחות`} />
            <KpiBar label="🎯 לידים"  actual={week.leads   || 0}  target={week.targetsLeads}    format={v => `${v} לידים`} />
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-3 text-center text-sm text-slate-400 mb-3">
            לא קיים מידע שבועי
          </div>
        )}

        {/* Brain state row */}
        {brain && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-50 rounded-xl p-2 text-center">
              <div className={`text-sm font-black ${
                brain.riskLevel === 'red' ? 'text-red-600' :
                brain.riskLevel === 'yellow' ? 'text-amber-600' : 'text-green-600'
              }`}>
                {brain.riskLevel === 'red' ? '🔴' : brain.riskLevel === 'yellow' ? '🟡' : '🟢'}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">{brain.riskLabel}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 text-center">
              <div className="text-sm font-black text-slate-700">{brain.modeEmoji}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{brain.modeLabel}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 text-center">
              <div className="text-sm font-black text-slate-700">{brain.executionPattern.emoji}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{brain.executionPattern.label}</div>
            </div>
          </div>
        )}

        {/* Conversation opener */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 mb-3">
          <div className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">💬 פתח שיחה</div>
          <div className="text-sm font-semibold text-brand-900 leading-relaxed">"{opener}"</div>
        </div>

        {/* Coach Push — visible for all trainees with a known email */}
        {trainee.email && <CoachPushForm traineeName={name} traineeEmail={trainee.email} />}
      </div>
    </div>
  )
}

// ─── Summary Header ───────────────────────────────────────────────────────────
function SummaryStrip({ counts, ghostCount }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: '🟢 בקצב',     count: counts.green,  color: 'bg-green-50 text-green-700 border-green-200' },
        { label: '🟡 לעקוב',    count: counts.yellow, color: 'bg-amber-50 text-amber-700 border-amber-200' },
        { label: '🔴 מאחור',    count: counts.red,    color: 'bg-red-50 text-red-700 border-red-200' },
        { label: '👻 אין מידע', count: ghostCount,    color: 'bg-slate-100 text-slate-600 border-slate-200' },
      ].map(s => (
        <div key={s.label} className={`rounded-xl border p-2 text-center ${s.color}`}>
          <div className="text-2xl font-black">{s.count}</div>
          <div className="text-[10px] font-semibold mt-0.5 leading-tight">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Add Coach Modal ──────────────────────────────────────────────────────────
function AddCoachModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', track: 'ליווי פרימיום', cohort: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Close on Escape
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await upsertCoach({ ...form, status: 'active', start_date: new Date().toISOString().split('T')[0] })
      if (result?.error) throw new Error(result.error.message || 'שגיאה בשמירה')
      onSaved()
      onClose()
    } catch (err) {
      setSaveError(err.message || 'שגיאה בשמירה — נסה שוב')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-black text-slate-800">הוסף מלווה חדש</h2>
        {[
          { key: 'name',   label: 'שם מלא',    placeholder: 'ליאור כהן' },
          { key: 'email',  label: 'אימייל',     placeholder: 'lior@example.com' },
          { key: 'phone',  label: 'טלפון',      placeholder: '054-0000000' },
          { key: 'track',  label: 'מסלול',      placeholder: 'ליווי פרימיום' },
          { key: 'cohort', label: 'קוהורט',     placeholder: 'קוהורט 6' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-xs font-bold text-slate-500 block mb-1">{label}</label>
            <input
              value={form[key]}
              onChange={e => F(key, e.target.value)}
              placeholder={placeholder}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        ))}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs font-semibold text-red-700">
            ⚠ {saveError}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.email.trim()}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-colors">
            {saving ? 'שומר...' : 'הוסף מלווה'}
          </button>
          <button onClick={onClose} className="px-4 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl text-sm transition-colors">
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Convert Supabase form row → week format expected by TraineeCard ──────────
function formRowToWeek(row) {
  if (!row) return null
  return {
    email:            row.coach_email,
    name:             row.coach_name,
    week:             row.form_week,
    month:            row.form_month,
    filledAt:         row.filled_at,
    leads:            row.leads,
    calls:            row.calls,
    closures:         row.closures,
    revenue:          row.revenue,
    targetsLeads:     row.targets_leads,
    targetsCalls:     row.targets_calls,
    targetsClosures:  row.targets_closures,
    targetsRevenue:   row.targets_revenue,
    bigThree:         row.big_three || [],
    bigThreeCompleted: row.big_three_completed || 0,
    biggestWin:       row.biggest_win,
    mostImportantNextWeek: row.most_important_next,
  }
}

// ─── Convert Supabase summary row → summary format expected by TaskSummaryStrip ─
function summaryRowToSummary(row) {
  if (!row) return null
  return {
    completionPct: row.completion_pct,
    big3Done:      row.big3_done,
    big3Total:     row.big3_total,
    stuckCount:    row.stuck_count,
    noGoalCount:   row.no_goal_count,
    weekLabel:     row.week_label,
    mainWin:       row.main_win,
    score:         row.score ?? null,  // official closed-week score
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Admin() {
  // PIN gate — auth persists for the current browser session only
  const [unlocked, setUnlocked] = useState(() => !!sessionStorage.getItem('flowos_admin_auth'))

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />

  return <AdminDashboard />
}

function AdminDashboard() {
  const seedTrainees = useData('admin.trainees')
  const [filter, setFilter] = useState('all')
  const [showAddCoach, setShowAddCoach] = useState(false)
  const [loading, setLoading] = useState(true)

  // Live data from Supabase
  const [liveCoaches,   setLiveCoaches]   = useState([])
  const [liveSummaries, setLiveSummaries] = useState([])
  const [liveForms,     setLiveForms]     = useState([])
  const [taskStatsMap,  setTaskStatsMap]  = useState(() => new Map())

  // Load the latest weekly summary from localStorage (current user)
  const latestSummary = useMemo(() => loadLatestSummary(), [])

  const loadLiveData = useCallback(async () => {
    setLoading(true)
    const [coaches, summaries, forms, tasksMap] = await Promise.all([
      fetchCoaches(),
      fetchCoachSummaries(),
      fetchAllWeeklyForms(),
      fetchAllTraineeTasks(),
    ])
    setLiveCoaches(coaches)
    setLiveSummaries(summaries)
    setLiveForms(forms)
    setTaskStatsMap(tasksMap)
    setLoading(false)
  }, [])

  useEffect(() => { loadLiveData() }, [loadLiveData])

  // Merge: Supabase coaches first, then seed coaches for demo purposes
  // Supabase coaches take precedence (real data > demo)
  const allTrainees = useMemo(() => {
    const liveEmails = new Set(liveCoaches.map(c => c.email))
    const seedFallback = liveCoaches.length === 0
      ? (seedTrainees || [])   // show seed data only when Supabase is empty (demo mode)
      : []
    return [...liveCoaches, ...seedFallback.filter(t => !liveEmails.has(t.email))]
  }, [liveCoaches, seedTrainees])

  const rows = useMemo(() => {
    return allTrainees.map(t => {
      // Prefer Supabase form data, fall back to seed raw data
      const liveFormRow = liveForms.find(f => f.coach_email === t.email)
      const week = liveFormRow ? formRowToWeek(liveFormRow) : getLatestWeek(t.email)

      // Prefer Supabase summary, fall back to local (for current user)
      const liveSumRow = liveSummaries.find(s => s.coach_email === t.email)
      const summaryForCard = liveSumRow
        ? summaryRowToSummary(liveSumRow)
        : (t.email === getCurrentUserEmail() ? latestSummary : null)

      const status    = getAdminStatus(week)
      const score     = calcWeeklyScore(week)
      const taskStats = taskStatsMap.get(t.email) || null
      return { ...t, week, status, score, summaryForCard, taskStats }
    }).sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3))
  }, [allTrainees, liveForms, liveSummaries, latestSummary, taskStatsMap])

  const counts = useMemo(() => {
    const c = { green: 0, yellow: 0, red: 0, gray: 0 }
    rows.forEach(r => { if (c[r.status] !== undefined) c[r.status]++ })
    return c
  }, [rows])

  const ghostCount = useMemo(
    () => rows.filter(r => daysSinceUpdate(r.week?.filledAt) > 10).length,
    [rows]
  )

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  return (
    <div>
      <TopBar title="מלווה — סקירת מתאמנים" />
      <div className="px-4 md:px-6 py-4 space-y-4 max-w-4xl mx-auto">

        {/* Live data indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                טוען נתונים...
              </span>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                {liveCoaches.length > 0 ? `${liveCoaches.length} מלווים ב-Supabase` : 'מצב דמו — הוסף מלווים אמיתיים'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Lock button — clears session auth */}
            <button
              onClick={() => { sessionStorage.removeItem('flowos_admin_auth'); window.location.reload() }}
              className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
              title="נעל דשבורד"
            >
              🔒 נעל
            </button>
            <button onClick={loadLiveData}
              className="text-[11px] font-bold text-brand-500 hover:text-brand-700 transition-colors">
              ⟳ רענן
            </button>
            <button
              onClick={() => setShowAddCoach(true)}
              className="flex items-center gap-1.5 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-xl transition-colors"
            >
              + הוסף מלווה
            </button>
          </div>
        </div>

        <SummaryStrip counts={counts} ghostCount={ghostCount} />

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Trainee Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Skeleton cards while first load */}
          {loading && filtered.length === 0 && [1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
              <div className="h-1.5 w-full bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 rounded-full w-32" />
                    <div className="h-2.5 bg-slate-100 rounded-full w-24" />
                  </div>
                  <div className="h-6 w-14 bg-slate-200 rounded-full" />
                </div>
                <div className="h-8 bg-slate-100 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-2 bg-slate-100 rounded-full" />
                  <div className="h-2 bg-slate-100 rounded-full w-4/5" />
                  <div className="h-2 bg-slate-100 rounded-full w-3/5" />
                </div>
                <div className="h-10 bg-brand-50 rounded-xl" />
              </div>
            </div>
          ))}
          {filtered.map(r => (
            <TraineeCard
              key={r.email}
              trainee={r}
              summary={r.summaryForCard}
              taskStats={r.taskStats}
            />
          ))}
          {filtered.length === 0 && !loading && (
            <div className="col-span-2 py-12 text-center">
              <div className="text-3xl mb-3">👥</div>
              <div className="text-slate-500 font-medium mb-2">
                {filter === 'all' ? 'עדיין אין מלווים' : 'אין מתאמנים בסטטוס זה'}
              </div>
              {filter === 'all' && (
                <button onClick={() => setShowAddCoach(true)}
                  className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors">
                  + הוסף מלווה ראשון
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-center text-xs text-slate-400 pb-4">
          {rows.length} מתאמנים סה"כ
          {liveCoaches.length > 0 && <span className="text-brand-400"> · נתונים חיים מ-Supabase</span>}
        </div>
      </div>

      {showAddCoach && (
        <AddCoachModal
          onClose={() => setShowAddCoach(false)}
          onSaved={loadLiveData}
        />
      )}
    </div>
  )
}
