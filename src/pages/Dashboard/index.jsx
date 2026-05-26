/**
 * Dashboard (בית) — home page of FlowOS.
 * Order: Coach Push → FlowBrainCard → Risk chip → Pressure → XP →
 *        MonthStatus → NextMissingStep → NearWin → SmartInsight →
 *        Gap → KPIs → Top3 → Momentum → WeeklyScore → AnnualPace
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Plus, X } from 'lucide-react'
import TopBar from '../../components/layout/TopBar.jsx'
import Card from '../../components/ui/Card.jsx'
import { useData } from '../../hooks/useData.js'
import { useStore } from '../../hooks/useStore.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import { calcWeeklyScore } from '../../utils/scoring.js'
import { calcPaceProjection } from '../../utils/insights.js'
import { formatCurrency, formatRelativeDate } from '../../utils/formatters.js'
import PressureBanner from '../../components/ui/PressureBanner.jsx'
import { fetchUnreadPush, markPushRead } from '../../lib/supabase.js'
import { getFlowBrainState } from '../../utils/flowBrain.js'
import { SCORE_COMPONENTS } from '../../constants/app.js'

import MonthStatusBanner from './MonthStatusBanner.jsx'
import SmartInsight from './SmartInsight.jsx'
import KPISummaryRow from './KPISummaryRow.jsx'
import TopThreeTasks from './TopThreeTasks.jsx'
import MomentumIndicator from './MomentumIndicator.jsx'

// ─── Coach Push Banner ────────────────────────────────────────────────────────
// Polls Supabase for unread pushes every 30 seconds.
function CoachPushBanner() {
  const { profile } = useStore()
  const [push, setPush] = useState(null)

  useEffect(() => {
    const email = profile?.email
    if (!email) return

    let cancelled = false

    async function poll() {
      const msg = await fetchUnreadPush(email)
      if (!cancelled) setPush(msg)
    }

    poll()
    const interval = setInterval(poll, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [profile?.email])

  if (!push) return null

  async function handleRead() {
    await markPushRead(push.id)
    setPush(null)
  }

  return (
    <div className="rounded-xl border-2 border-brand-400 bg-brand-50 px-4 py-3 flex items-start gap-3 shadow-sm">
      <span className="text-xl shrink-0 mt-0.5">👤</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">
          המלווה שלך
        </p>
        <p className="text-sm font-bold text-brand-900 leading-snug">{push.message}</p>
        {push.task_title && (
          <p className="text-xs text-brand-600 mt-0.5 font-medium">← {push.task_title}</p>
        )}
      </div>
      <button
        onClick={handleRead}
        className="text-xs font-black text-brand-600 hover:text-brand-800 bg-brand-100 hover:bg-brand-200 px-2.5 py-1 rounded-lg transition-colors shrink-0"
      >
        קיבלתי ✓
      </button>
    </div>
  )
}

// ─── Next Missing Step — guides empty dashboards toward action ────────────────
function computeMissingStep(profile, monthly, tasks) {
  // Priority order: month goal → weekly tasks → Big 3
  const hasMonthlyGoal = !!(monthly?.revenueTarget)
  const hasWeeklyTasks = tasks.filter(t => t.status === 'week' || t.status === 'today').length > 0
  const hasBigThree    = tasks.filter(t => t.isBigThree).length > 0

  if (!hasMonthlyGoal) {
    return {
      icon: '🎯',
      title: 'הגדר יעד חודשי',
      body: 'המערכת לא יכולה לנתח את הביצועים שלך ללא יעד הכנסות חודשי. זה לוקח 30 שניות.',
      cta: 'הגדר יעד →',
      path: '/',  // Journey → Monthly section
      section: 'monthly',
    }
  }
  if (!hasWeeklyTasks) {
    return {
      icon: '📋',
      title: 'בנה את השבוע',
      body: 'אין לך משימות שבועיות. הוסף לפחות 3 משימות ל"היום" או לשבוע הנוכחי.',
      cta: 'פתח לוח שבועי →',
      path: '/weekly',
      section: null,
    }
  }
  if (!hasBigThree) {
    return {
      icon: '🔥',
      title: 'בחר 3 הגדולים',
      body: 'אין לך משימות מסומנות כ-Big 3. בחר 3 משימות שאם תגמור אותן — השבוע הצליח.',
      cta: 'פתח לוח שבועי →',
      path: '/weekly',
      section: null,
    }
  }
  return null  // everything is set — no card needed
}

function NextMissingStep({ profile, monthly, tasks }) {
  const navigate = useNavigate()
  const step = computeMissingStep(profile, monthly, tasks)
  if (!step) return null

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0 mt-0.5">{step.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">הצעד הבא שלך</p>
          <p className="text-base font-black text-slate-800 leading-snug mb-1">{step.title}</p>
          <p className="text-sm text-slate-500 leading-relaxed mb-3">{step.body}</p>
          <button
            onClick={() => navigate(step.path)}
            className="flex items-center gap-1.5 text-sm font-black text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3.5 py-2 rounded-xl transition-colors"
          >
            {step.cta} <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── Flow Brain Card — replaces the old NextActionCard ───────────────────────
const URGENCY_CONFIG = {
  high:   { bg: 'from-slate-900 via-red-950/80 to-slate-900',   ring: 'from-red-500/60 via-orange-500/40 to-red-500/60',   label: '🔴 דחוף' },
  medium: { bg: 'from-slate-900 via-brand-900/70 to-slate-900', ring: 'from-brand-500/50 via-purple-500/40 to-brand-500/50', label: '🟡 חשוב' },
  low:    { bg: 'from-slate-900 via-slate-800 to-slate-900',    ring: 'from-slate-600/40 via-slate-500/30 to-slate-600/40',   label: '🟢 הבא' },
}

function FlowBrainCard({ brain }) {
  const navigate = useNavigate()
  const { nextBestAction: action, identitySentence, modeLabel, modeEmoji } = brain
  const cfg = URGENCY_CONFIG[action.urgency] || URGENCY_CONFIG.low

  return (
    /* Animated gradient border wrapper */
    <div className="relative rounded-2xl p-[1.5px] overflow-hidden"
      style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}>
      {/* Animated border gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${cfg.ring} animate-[spin_4s_linear_infinite] opacity-80`}
        style={{ borderRadius: 'inherit' }} />
      <div className={`relative rounded-2xl bg-gradient-to-br ${cfg.bg} p-4 shadow-xl overflow-hidden`}>
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }} />

        {/* Mode chip + identity */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-semibold text-white/50 leading-none truncate max-w-[60%]">
            {identitySentence}
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 shrink-0 border border-white/10">
            {modeEmoji} {modeLabel}
          </span>
        </div>

        {/* Main action */}
        <div className="flex items-start gap-3">
          <span className="text-4xl leading-none shrink-0 mt-0.5 drop-shadow-lg">{action.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-base font-black text-white leading-snug mb-1.5">
              {action.actionLabel}
            </div>
            <div className="text-sm text-white/70 leading-relaxed">
              {action.reason}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
          <span className="text-xs font-medium text-white/40">⏱ {action.estimatedTime}</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/10">
              {cfg.label}
            </span>
            {action.path && (
              <button
                onClick={() => navigate(action.path)}
                className="group text-[11px] font-black px-3 py-1 rounded-full bg-brand-500/40 hover:bg-brand-500/60 text-brand-200 hover:text-white transition-all duration-200 border border-brand-400/30 flex items-center gap-1"
              >
                צא לפעולה
                <span className="group-hover:translate-x-[-2px] transition-transform inline-block">←</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Risk Chip ────────────────────────────────────────────────────────────────
function RiskChip({ brain }) {
  const { riskLevel, riskLabel, coachMessage } = brain
  if (riskLevel === 'green') return null   // don't show green — no news is good news

  const styles = {
    red:    'bg-red-50 border-red-200 text-red-800',
    yellow: 'bg-amber-50 border-amber-200 text-amber-800',
  }

  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[riskLevel] || styles.yellow}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-lg shrink-0 mt-0.5">{riskLevel === 'red' ? '🔴' : '🟡'}</span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1">{riskLabel}</p>
          <p className="text-xs font-semibold leading-relaxed">{coachMessage}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Near Win Banner ──────────────────────────────────────────────────────────
function NearWinBanner({ brain }) {
  const hints = brain.nearWinHints
  if (!hints?.length) return null
  if (brain.userMode !== 'NearWin' && brain.userMode !== 'Momentum') return null

  return (
    <div className="rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3">
      <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">
        🏁 מה יסגור את השבוע
      </p>
      <div className="space-y-1.5">
        {hints.map((h, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="shrink-0 text-base leading-none mt-0.5">{h.icon}</span>
            <p className="text-xs font-semibold text-green-900 leading-snug">{h.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Win Log ─────────────────────────────────────────────────────────────────
const WIN_LOG_KEY = 'flowos_wins'

function loadWins() {
  try { return JSON.parse(localStorage.getItem(WIN_LOG_KEY) || '[]') } catch { return [] }
}

function saveWins(wins) {
  try { localStorage.setItem(WIN_LOG_KEY, JSON.stringify(wins)) } catch {}
}

function WinLog() {
  const [wins,   setWins]   = useState(() => loadWins())
  const [input,  setInput]  = useState('')
  const [open,   setOpen]   = useState(false)

  const addWin = useCallback(() => {
    const text = input.trim()
    if (!text) return
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2))
    const next = [{ id, text, date: new Date().toISOString() }, ...wins].slice(0, 20)
    setWins(next)
    saveWins(next)
    setInput('')
    setOpen(false)
  }, [input, wins])

  const removeWin = useCallback((id) => {
    const next = wins.filter(w => w.id !== id)
    setWins(next)
    saveWins(next)
  }, [wins])

  const recent = wins.slice(0, 5)

  return (
    <div className="rounded-2xl overflow-hidden border border-amber-200/70 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 flex items-center justify-between border-b border-amber-100">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-black text-amber-800">ניצחונות</span>
          {wins.length > 0 && (
            <span className="text-[10px] font-black bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full">{wins.length}</span>
          )}
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-white hover:bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-3 h-3" /> הוסף ניצחון
        </button>
      </div>

      <div className="bg-white p-3">
        {open && (
          <div className="flex gap-2 mb-3 animate-slide-up">
            <input
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addWin()
                if (e.key === 'Escape') { setOpen(false); setInput('') }
              }}
              placeholder="מה ניצחת היום? כתוב בגאווה 🏆"
              className="flex-1 text-sm px-3 py-2.5 border border-amber-300 bg-amber-50/50 rounded-xl outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
              dir="rtl"
            />
            <button onClick={addWin} className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all text-sm font-black active:scale-95">
              ✓
            </button>
            <button onClick={() => { setOpen(false); setInput('') }} className="px-2 py-2 text-amber-300 hover:text-amber-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {recent.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-1">🏆</div>
            <p className="text-xs text-slate-400">עדיין אין ניצחונות — תתחיל לרשום אותם</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recent.map((w, i) => (
              <div key={w.id} className="flex items-center gap-2 bg-amber-50/60 hover:bg-amber-50 rounded-xl px-3 py-2 border border-amber-100/80 transition-colors group animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}>
                <span className="text-base shrink-0 leading-none">🏆</span>
                <span className="flex-1 text-xs font-semibold text-slate-700 leading-snug">{w.text}</span>
                <span className="text-[10px] text-slate-300 shrink-0">
                  {new Date(w.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                </span>
                <button onClick={() => removeWin(w.id)} className="text-slate-200 hover:text-red-400 shrink-0 transition-colors opacity-0 group-hover:opacity-100">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── XP + Streak strip ───────────────────────────────────────────────────────
function XPStrip({ xp, streak }) {
  if (xp === 0 && streak.days === 0) return null
  // XP level thresholds (every 500 XP = level up)
  const level      = Math.floor(xp / 500) + 1
  const levelStart = (level - 1) * 500
  const levelEnd   = level * 500
  const pct        = Math.round(((xp - levelStart) / 500) * 100)
  const isOnFire   = streak.days >= 3

  return (
    <div className={`rounded-2xl px-4 py-3 overflow-hidden relative ${
      isOnFire
        ? 'bg-gradient-to-r from-orange-950 via-red-900 to-orange-950 border border-orange-800/40'
        : 'bg-gradient-to-r from-slate-900 via-brand-950/80 to-slate-900 border border-brand-800/30'
    }`}>
      {/* Subtle animated shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />

      <div className="flex items-center gap-4 relative">
        {/* XP section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base leading-none">⚡</span>
            <span className="text-sm font-black text-amber-400 tabular-nums">{xp.toLocaleString()} XP</span>
            <span className="text-[10px] font-bold text-white/30 bg-white/10 px-1.5 py-0.5 rounded-full">Lv.{level}</span>
          </div>
          {/* XP progress bar */}
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isOnFire ? 'bg-gradient-to-r from-orange-400 to-amber-300' : 'bg-gradient-to-r from-brand-400 to-purple-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[9px] text-white/30 mt-0.5 tabular-nums">{pct}% לרמה {level + 1}</div>
        </div>

        {/* Streak section */}
        {streak.days > 0 && (
          <div className={`flex flex-col items-center shrink-0 px-3 py-1 rounded-xl border ${
            isOnFire ? 'bg-orange-500/20 border-orange-500/30' : 'bg-white/5 border-white/10'
          }`}>
            <span className={`text-2xl leading-none ${isOnFire ? 'animate-bounce' : ''}`}>
              {isOnFire ? '🔥' : '✦'}
            </span>
            <span className={`text-sm font-black tabular-nums ${isOnFire ? 'text-orange-300' : 'text-white/70'}`}>
              {streak.days}
            </span>
            <span className="text-[9px] text-white/30">ימים</span>
          </div>
        )}
      </div>
    </div>
  )
}

function loadWeeklySummaries() {
  try { return JSON.parse(localStorage.getItem('flowos_weekly_summaries') || '[]') } catch { return [] }
}

export default function Dashboard() {
  const latest   = useData('raw.latest')
  const allWeeks = useData('raw.allWeeks')
  const snapshot = useData('dashboard')
  const period   = usePeriod()
  const { tasks, monthly, quarterly, xp, streak, profile } = useStore()
  const score    = calcWeeklyScore(latest)

  const annualTarget = profile?.annualGoals?.revenueTarget || 0
  const projection   = calcPaceProjection(allWeeks, annualTarget)
  const gap          = snapshot?.gapRevenue || 0

  // Load real weekly summaries from localStorage (written by CloseWeekModal)
  const weeklySummaries = useMemo(() => loadWeeklySummaries(), [])

  // Flow Brain Engine — now receives real historical summaries
  const brain = useMemo(() => getFlowBrainState({
    profile,
    quarterly,
    monthly,
    tasks,
    weeklySummaries,
  }), [profile, quarterly, monthly, tasks, weeklySummaries])

  const scoreColor =
    score.score >= 80 ? '#22c55e' :
    score.score >= 60 ? '#eab308' : '#ef4444'

  const scoreLabel =
    score.score >= 80 ? '🏆 שבוע מעולה' :
    score.score >= 60 ? '📈 על המסלול' :
    score.score >= 40 ? '⚠️ יש מקום לשיפור' : '🔴 שבוע קשה'

  // Today's stats
  const completedToday = tasks.filter(t => {
    if (t.status !== 'done' || !t.completedAt) return false
    const d = new Date(t.completedAt)
    const today = new Date(); today.setHours(0,0,0,0)
    return d >= today
  }).length
  const doingNow = tasks.filter(t => t.status === 'doing').length

  const hourNow = new Date().getHours()
  const greeting = hourNow < 12 ? '☀️ בוקר טוב' : hourNow < 17 ? '⚡ אחה"צ טובה' : '🌙 ערב טוב'

  // New-user detection: no tasks + no monthly goal
  const isNewUser = tasks.length === 0 && !monthly?.revenueTarget

  if (isNewUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col">
        <TopBar title={`${greeting}, ${profile?.name?.split(' ')[0] || ''}`} subtitle="ברוך הבא ל-FlowOS" />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center max-w-sm mx-auto gap-6">
          <div className="text-7xl">🚀</div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              {profile?.name?.split(' ')[0] ? `${profile.name.split(' ')[0]}, בוא נתחיל` : 'בוא נתחיל'}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              כדי לראות כאן ניתוח ביצועים, FlowBrain ותחזיות — צריך להוסיף כמה פרטים
            </p>
          </div>
          <div className="w-full space-y-3">
            <button onClick={() => navigate('/weekly')}
              className="w-full flex items-center gap-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl px-5 py-4 transition-colors">
              <span className="text-2xl shrink-0">📋</span>
              <div className="text-right">
                <div className="text-sm font-black">הוסף משימות לשבוע</div>
                <div className="text-xs text-white/70">פתח לוח שבועי וצור 3 משימות</div>
              </div>
              <ArrowLeft className="w-4 h-4 mr-auto shrink-0" />
            </button>
            <button onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-2xl px-5 py-4 transition-colors shadow-sm">
              <span className="text-2xl shrink-0">🎯</span>
              <div className="text-right">
                <div className="text-sm font-black">הגדר יעד חודשי</div>
                <div className="text-xs text-slate-400">ביומן המסע — לוקח 30 שניות</div>
              </div>
              <ArrowLeft className="w-4 h-4 mr-auto shrink-0 text-slate-300" />
            </button>
          </div>
          <p className="text-xs text-slate-400">
            אחרי שתוסיף משימות ויעד — הדשבורד יתמלא בניתוחים ובהמלצות
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <TopBar title={`${greeting}, ${profile?.name?.split(' ')[0] || ''}`} subtitle={`${period.month} · ${period.weekLabel}`} />

      {/* Hero stat strip */}
      {(completedToday > 0 || doingNow > 0) && (
        <div className="px-4 md:px-6 pt-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            {completedToday > 0 && (
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1.5 animate-bounce-in">
                <span className="text-sm">✅</span>
                <span className="text-xs font-black text-green-700">{completedToday} בוצעו היום</span>
              </div>
            )}
            {doingNow > 0 && (
              <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 rounded-full px-3 py-1.5 animate-bounce-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                </span>
                <span className="text-xs font-black text-purple-700">{doingNow} בביצוע</span>
              </div>
            )}
            {score.score > 0 && (
              <div className="flex items-center gap-1.5 bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5 animate-bounce-in mr-auto">
                <span className="text-xs font-black text-brand-600">{score.score} ציון שבועי</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 py-4 space-y-4 max-w-2xl mx-auto">

        {/* 0. Coach Push — highest priority if unread */}
        <CoachPushBanner />

        {/* 1. Flow Brain Card — action + mode + identity */}
        <FlowBrainCard brain={brain} />

        {/* 1b. Risk chip — only when red/yellow */}
        <RiskChip brain={brain} />

        {/* 1c. Pressure Banner — shows only when there's a real problem */}
        <PressureBanner tasks={tasks} />

        {/* 2. XP + Streak */}
        <XPStrip xp={xp} streak={streak} />

        {/* 3. Monthly Status Banner */}
        <MonthStatusBanner />

        {/* 3b. Next Missing Step — guides the user when dashboard is sparse */}
        <NextMissingStep profile={profile} monthly={monthly} tasks={tasks} />

        {/* 3c. Near Win Banner — NearWin + Momentum modes only */}
        <NearWinBanner brain={brain} />

        {/* 4. Smart Insight */}
        <SmartInsight />

        {/* 5. Gap-to-Goal */}
        {gap > 0 && (
          <div className="rounded-2xl p-4 bg-slate-900 text-white flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">חסר ליעד השבועי</div>
              <div className="text-3xl font-black tabular-nums">{formatCurrency(gap)}</div>
            </div>
            <div className="text-right">
              <div className="text-4xl">🎯</div>
              <div className="text-xs text-slate-400 mt-1">{period.weekLabel}</div>
            </div>
          </div>
        )}

        {/* 6. KPI Summary 2×2 */}
        <KPISummaryRow />

        {/* 7. Top 3 */}
        <TopThreeTasks />

        {/* 8. Momentum */}
        <MomentumIndicator />

        {/* 8b. Win Log — track and celebrate wins */}
        <WinLog />

        {/* 9. Weekly Score — premium dark card */}
        {latest && (
          <div className="rounded-2xl overflow-hidden shadow-lg">
            {/* Gradient background based on score */}
            <div className={`p-5 ${
              score.score >= 80 ? 'bg-gradient-to-br from-slate-900 via-green-950/50 to-slate-900'
              : score.score >= 60 ? 'bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900'
              : 'bg-gradient-to-br from-slate-900 via-red-950/40 to-slate-900'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">ציון שבועי</div>
                  <div className="text-[11px] font-medium mt-0.5 text-white/30">{period.weekLabel} · {period.month}</div>
                </div>
                <span className="text-[11px] font-black bg-white/10 text-white/80 px-3 py-1 rounded-full border border-white/10">
                  רמה {score.level}/10
                </span>
              </div>

              <div className="flex items-end gap-4 mb-5">
                <div className="text-8xl font-black tabular-nums leading-none" style={{ color: scoreColor,  textShadow: `0 0 40px ${scoreColor}50` }}>
                  {score.score}
                </div>
                <div className="mb-3 space-y-0.5">
                  <div className="text-sm font-black text-white/80">{scoreLabel}</div>
                  <div className="text-[10px] text-white/30">מתוך 100</div>
                </div>
              </div>

              <div className="space-y-3">
                {SCORE_COMPONENTS.map(c => (
                  <div key={c.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/50 font-semibold">{c.label}</span>
                      <span className="text-[11px] font-black tabular-nums" style={{ color: c.color }}>
                        {score.components[c.key] || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${score.components[c.key] || 0}%`,
                          background: `linear-gradient(90deg, ${c.color}aa, ${c.color})`,
                          boxShadow: `0 0 8px ${c.color}60`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 10. Annual Pace */}
        {projection && (
          <Card className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-bold text-slate-800">קצב שנתי</h2>
                <p className="text-xs text-slate-400 mt-0.5">בקצב הנוכחי תסיים השנה ב:</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                projection.pct >= 90 ? 'bg-green-100 text-green-700' :
                projection.pct >= 70 ? 'bg-amber-100 text-amber-700' :
                                       'bg-red-100 text-red-700'
              }`}>
                {projection.pct}% מהיעד
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 tabular-nums mb-0.5">
              {formatCurrency(projection.projectedAnnual)}
            </div>
            <div className="text-xs text-slate-400 mb-3">
              יעד: {formatCurrency(projection.annualTarget)} · ממוצע שבועי: {formatCurrency(projection.weeklyPace)}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  projection.pct >= 90 ? 'bg-green-500' :
                  projection.pct >= 70 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.min(100, projection.pct)}%` }}
              />
            </div>
            <p className={`text-xs mt-2 font-semibold ${
              projection.gapPct < 0 ? 'text-red-500' : 'text-green-600'
            }`}>
              {projection.gapPct < 0
                ? `${Math.abs(projection.gapPct)}% מתחת ליעד — נדרש האצת קצב`
                : `${projection.gapPct}% מעל היעד — המשך ככה 🎉`
              }
            </p>
          </Card>
        )}

        {latest && (
          <div className="text-center text-xs text-slate-400 pb-4">
            עודכן לאחרונה: {formatRelativeDate(latest?.filledAt)}
          </div>
        )}

      </div>
    </div>
  )
}
