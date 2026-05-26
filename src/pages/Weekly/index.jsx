/**
 * Weekly Board — 5-column Kanban task manager
 * Columns: backlog / week / today / doing / done
 * Features: Big 3 (max 3), goal linking, priority, type, full edit modal, progress strip
 *
 * Backward-compatible: old tasks with numeric priority get normalized.
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Check, X,
  Star, AlertTriangle, Clock, Target,
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TopBar from '../../components/layout/TopBar.jsx'
import TaskCard from './TaskCard.jsx'
import TaskModal from './TaskModal.jsx'
import CloseWeekModal from './CloseWeekModal.jsx'
import QuickAddForm from './QuickAddForm.jsx'
import { useStore } from '../../hooks/useStore.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import { formatCurrency } from '../../utils/formatters.js'
import PressureBanner from '../../components/ui/PressureBanner.jsx'
import { getUnlinkedActive } from '../../utils/pressure.js'
import { getFlowBrainState } from '../../utils/flowBrain.js'
import { getNextBestTask, computeExecutionScore } from '../../engine/executionEngine.js'
import { detectNoise, noiseScore } from '../../engine/noiseDetector.js'
import {
  DAILY_CAPACITY_MINUTES,
  STUCK_HOURS,
  CARRYOVER_THRESHOLD_HOURS,
  MAX_BIG3,
  MAX_WEEKLY_SUMMARIES,
  UNDO_TOAST_MS,
  BOUNCE_ANIM_MS,
  BIG3_ERROR_MS,
} from '../../constants/app.js'
import { normPriority, startOfToday } from '../../utils/tasks.js'

// ─── Drag & Drop — custom collision detection for multi-column Kanban ─────────
// pointerWithin first (exact pointer hit), fallback to rectIntersection.
// This is more reliable than closestCorners for multi-column layouts because
// closestCorners can fire the wrong column when hovering near a column edge.
function kanbanCollision(args) {
  const hits = pointerWithin(args)
  if (hits.length > 0) return hits
  return rectIntersection(args)
}

// ─── Meta ──────────────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'backlog', label: 'רעיונות', emoji: '💡', tagBg: 'bg-slate-100 text-slate-600',   headerBorder: 'border-slate-200',  accentBar: 'bg-slate-300',  canAdd: true,  emptyIcon: '🌱', emptyText: 'לוח ריק',         emptySub: 'הוסף רעיונות ומשימות לפיתוח' },
  { id: 'week',    label: 'השבוע',   emoji: '📅', tagBg: 'bg-blue-100 text-blue-700',     headerBorder: 'border-blue-200',   accentBar: 'bg-blue-400',   canAdd: true,  emptyIcon: '📋', emptyText: 'שבוע ריק',         emptySub: 'גרור משימות מהרשימה לשבוע' },
  { id: 'today',   label: 'היום',    emoji: '🎯', tagBg: 'bg-brand-100 text-brand-700',   headerBorder: 'border-brand-200',  accentBar: 'bg-brand-500',  canAdd: true,  emptyIcon: '☀️', emptyText: 'עוד לא בחרת',      emptySub: 'בחר 1–3 משימות ועשה אותן' },
  { id: 'doing',   label: 'בביצוע',  emoji: '⚡', tagBg: 'bg-purple-100 text-purple-700', headerBorder: 'border-purple-200', accentBar: 'bg-purple-500', canAdd: false, emptyIcon: '🎧', emptyText: 'לא בביצוע',        emptySub: 'בחר משימה והתחל!', liveDot: true },
  { id: 'done',    label: 'בוצע',    emoji: '✓',  tagBg: 'bg-green-100 text-green-700',   headerBorder: 'border-green-200',  accentBar: 'bg-green-500',  canAdd: false, emptyIcon: '🏆', emptyText: 'עוד לא הושלם',     emptySub: 'בוא נשנה את זה היום' },
]

const PRIORITY_META = {
  critical: { label: 'קריטי', bg: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  high:     { label: 'גבוה',  bg: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  medium:   { label: 'בינוני', bg: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  low:      { label: 'נמוך',  bg: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-300' },
}

const TYPE_META = {
  strategy:   { label: 'אסטרטגיה', emoji: '🎯' },
  sales:      { label: 'מכירות',   emoji: '💰' },
  marketing:  { label: 'שיווק',    emoji: '📣' },
  content:    { label: 'תוכן',     emoji: '📝' },
  operations: { label: 'תפעול',    emoji: '⚙️' },
  finance:    { label: 'פיננסים',  emoji: '💳' },
  mindset:    { label: 'מנטלי',    emoji: '🧠' },
  personal:   { label: 'אישי',     emoji: '🌱' },
}

// ─── Goal Tension Bar (inline, used inside TaskCard) ─────────────────────────
// Shows which goal this task advances + type label.
// Kept minimal so it doesn't clutter small cards.
function InlineGoalBar({ task, quarterly, monthly }) {
  if (!task.goalRef) return null
  const typeLabel = task.goalType === 'quarterly' ? 'רבעוני' : task.goalType === 'monthly' ? 'חודשי' : null
  const typeColor = task.goalType === 'quarterly'
    ? 'text-purple-600 bg-purple-50'
    : 'text-blue-600 bg-blue-50'
  return (
    <div className="flex items-center gap-1 mt-1 text-[10px]">
      <Target className="w-2.5 h-2.5 text-slate-300 shrink-0" />
      <span className="text-slate-400 truncate max-w-[140px]">{task.goalRef}</span>
      {typeLabel && (
        <span className={`shrink-0 px-1 py-0.5 rounded font-bold ${typeColor}`}>{typeLabel}</span>
      )}
    </div>
  )
}

// Action button helper
const AB = 'flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-colors'

// ── Due date helpers ──────────────────────────────────────────────────────────
function dueDateStatus(dueDate) {
  if (!dueDate) return null
  const due  = new Date(dueDate)
  due.setHours(23, 59, 59, 999)
  const now  = new Date()
  const diff    = Math.ceil((due - now) / 86_400_000)  // days remaining
  const dayWord = (n) => n === 1 ? 'יום' : 'ימים'
  const abs     = Math.abs(diff)
  if (diff < 0)  return { label: `פג תוקף לפני ${abs} ${dayWord(abs)}`, color: 'text-red-600 bg-red-50',   dot: 'bg-red-500',    overdue: true }
  if (diff === 0) return { label: 'היום',                                 color: 'text-red-500 bg-red-50',   dot: 'bg-red-400',    overdue: false }
  if (diff === 1) return { label: 'מחר',                                  color: 'text-amber-600 bg-amber-50', dot: 'bg-amber-400', overdue: false }
  if (diff <= 3)  return { label: `עוד ${diff} ${dayWord(diff)}`,          color: 'text-amber-500 bg-amber-50', dot: 'bg-amber-300', overdue: false }
  const d = new Date(dueDate)
  const fmt = `${d.getDate()}/${d.getMonth() + 1}`
  return { label: fmt, color: 'text-slate-400 bg-slate-50', dot: 'bg-slate-300', overdue: false }
}

// Load the latest weekly summary context (for richer reasons)
function loadSummaryContext() {
  try {
    const arr = JSON.parse(localStorage.getItem('flowos_weekly_summaries') || '[]')
    return arr[0] || null
  } catch { return null }
}

// Pick the single best next task — considers state, stuck, unlinked, and summary
function pickNextBest(tasks) {
  const active   = tasks.filter(t => t.status !== 'done')
  const summary  = loadSummaryContext()
  const unlinked = getUnlinkedActive(tasks)

  // P1 — open Big 3 not yet in doing
  const big3Open = active.find(t => t.isBigThree && t.status !== 'doing')
  if (big3Open) {
    const extraCtx = summary?.noGoalCount >= 3
      ? ` (יש ${summary.noGoalCount} ללא יעד — הגדולים קודם)`
      : ''
    return {
      task:     big3Open,
      reason:   `זה ה-Big 3 הפתוח שלך — תתחיל עם זה${extraCtx}`,
      tag:      '★ Big 3', tagColor: 'bg-brand-100 text-brand-700',
    }
  }

  // P2 — task stuck in doing >STUCK_HOURS
  const stuckTask = active.find(t => {
    if (t.status !== 'doing' || !t.updatedAt) return false
    return (Date.now() - new Date(t.updatedAt).getTime()) / 3_600_000 > STUCK_HOURS
  })
  if (stuckTask) return {
    task:     stuckTask,
    reason:   `בביצוע מעל ${STUCK_HOURS} שעות — סגור, פרק, או בטל`,
    tag:      '⚠ תקוע', tagColor: 'bg-red-100 text-red-700',
  }

  // P3 — critical in today/week
  const critical = active.find(t =>
    normPriority(t.priority) === 'critical' && (t.status === 'today' || t.status === 'week')
  )
  if (critical) return {
    task:     critical,
    reason:   'משימה קריטית מחכה — אל תתן לה לחכות',
    tag:      '🔴 קריטי', tagColor: 'bg-red-100 text-red-700',
  }

  // P3.5 — critical unlinked task (noise risk — name it explicitly)
  const criticalUnlinked = active.find(t =>
    !t.goalRef && normPriority(t.priority) === 'critical' && t.status === 'today'
  )
  if (criticalUnlinked) return {
    task:     criticalUnlinked,
    reason:   'קריטי אבל לא מחובר ליעד — סגור אותה, אחר כך חבר ליעד',
    tag:      '🔴 ללא יעד', tagColor: 'bg-red-100 text-red-700',
  }

  // P4 — high priority today
  const highToday = active.find(t =>
    normPriority(t.priority) === 'high' && t.status === 'today'
  )
  if (highToday) return {
    task:     highToday,
    reason:   'עדיפות גבוהה ב"היום" — זה מה שמניע הכנסות',
    tag:      'גבוה', tagColor: 'bg-orange-100 text-orange-700',
  }

  // P4.5 — too many unlinked tasks (from summary or live count) — surface the noise
  if (unlinked.length >= 4) return {
    task:     unlinked[0],
    reason:   `${unlinked.length} משימות ללא יעד — זו אחת מהן. חבר ליעד או בטל.`,
    tag:      '⚠ ללא יעד', tagColor: 'bg-amber-100 text-amber-700',
  }

  // P5 — anything in today
  const anyToday = active.find(t => t.status === 'today')
  if (anyToday) return {
    task:     anyToday,
    reason:   'המשימה הבאה בתור — סגור אותה ואז הבא',
    tag:      'היום', tagColor: 'bg-amber-100 text-amber-700',
  }

  return null
}

// ─── Weekly Progress Strip ────────────────────────────────────────────────────
function WeeklyProgress({ tasks, onCloseWeek }) {
  const active    = tasks.filter(t => t.status !== 'done')
  const done      = tasks.filter(t => t.status === 'done')
  const total     = tasks.length
  const pct       = total > 0 ? Math.round((done.length / total) * 100) : 0
  const big3      = tasks.filter(t => t.isBigThree)
  const big3Done  = big3.filter(t => t.status === 'done').length
  const critical  = active.filter(t => normPriority(t.priority) === 'critical').length
  const onTrack   = big3Done >= 2 || (big3.length === 0 && pct >= 50)

  // T1-E — daily completion score
  const todayScore = useMemo(() => {
    const sot = startOfToday()
    return tasks.filter(t => t.completedAt && new Date(t.completedAt) >= sot).length
  }, [tasks])
  const [prevScore, setPrevScore] = useState(todayScore)
  const [bounce, setBounce]       = useState(false)
  useEffect(() => {
    if (todayScore >= 3 && todayScore > prevScore) {
      setBounce(true)
      const t = setTimeout(() => setBounce(false), 1500)
      return () => clearTimeout(t)
    }
    setPrevScore(todayScore)
  }, [todayScore]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-black text-slate-800">{done.length}/{total} בוצע</span>
          <span className="text-xs font-bold text-brand-600">
            <Star className="w-3 h-3 inline fill-brand-500 text-brand-500 ml-1" />
            Big3: {big3Done}/{big3.length || 3}
          </span>
          {critical > 0 && (
            <span className="text-xs font-bold text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />{critical} קריטי
            </span>
          )}
          {/* T1-E: daily score badge */}
          {todayScore > 0 && (
            <span className={`text-xs font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 ${bounce ? 'animate-bounce' : ''}`}>
              היום: {todayScore} ✓
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
            onTrack ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {onTrack ? '✓ על המסלול' : '⚠ דורש תשומת לב'}
          </span>
          <button
            onClick={onCloseWeek}
            className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-white hover:bg-slate-900 transition-colors"
          >
            סגור שבוע →
          </button>
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Execution Pulse ──────────────────────────────────────────────────────────
// Visual completion blocks — one block per today task, fills green on done.
function ExecutionPulse({ tasks }) {
  const sot = startOfToday()

  const todaySlots = useMemo(() => [
    ...tasks.filter(t => t.status === 'today' || t.status === 'doing'),
    ...tasks.filter(t => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= sot),
  ], [tasks, sot])

  const doneToday = todaySlots.filter(t => t.status === 'done').length
  const [prevDone, setPrevDone] = useState(doneToday)
  const [flashIdx, setFlashIdx] = useState(null)

  // Flash the newly completed block
  useEffect(() => {
    if (doneToday > prevDone) {
      setFlashIdx(doneToday - 1)
      setTimeout(() => setFlashIdx(null), 900)
    }
    setPrevDone(doneToday)
  }, [doneToday]) // eslint-disable-line react-hooks/exhaustive-deps

  if (todaySlots.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 px-1">
      {todaySlots.map((t, i) => {
        const isDone   = t.status === 'done'
        const isDoing  = t.status === 'doing'
        const isFlash  = i === flashIdx
        return (
          <div
            key={t.id}
            className={`flex-1 h-2 rounded-full transition-all duration-500 ${
              isFlash  ? 'bg-green-400 scale-y-150 shadow-sm shadow-green-300' :
              isDone   ? 'bg-green-500' :
              isDoing  ? 'bg-purple-400 animate-pulse' :
              'bg-slate-200'
            }`}
            title={t.title}
          />
        )
      })}
      <span className="text-[10px] font-black text-slate-500 shrink-0 ml-1">
        {doneToday}/{todaySlots.length}
      </span>
    </div>
  )
}

// ─── Next Best Task ───────────────────────────────────────────────────────────
function NextBestTask({ tasks, onMove, onFocus }) {
  // Use the new execution engine first; fall back to legacy picker for edge cases
  const engineResult = useMemo(() => getNextBestTask(tasks), [tasks])
  const legacyResult = useMemo(() => pickNextBest(tasks), [tasks])
  const result = engineResult || legacyResult

  if (!result) return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-center text-sm text-slate-400 shadow-sm">
      ✨ אין משימות פתוחות — שבוע מצוין!
    </div>
  )

  // Normalise: engine returns { task, reason, score }; legacy returns { task, reason, tag, tagColor }
  const task   = result.task
  const reason = result.reason
  const score  = result.score ?? computeExecutionScore(task)
  const tag    = result.tag    ?? (task.isBigThree ? '★ Big 3' : task.status === 'doing' ? '⚡ בביצוע' : 'הבא')
  const tagColor = result.tagColor ?? 'bg-brand-100 text-brand-700'

  const tMeta = TYPE_META[task.type] || TYPE_META.strategy

  // Score bar color
  const scoreBarColor = score >= 80 ? 'bg-green-400' : score >= 55 ? 'bg-amber-400' : 'bg-slate-400'

  return (
    <div className="bg-slate-900 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          ▶ זה הדבר הבא שלך
        </div>
        {/* Execution score micro-badge */}
        <div className="flex items-center gap-1.5" title={`ציון עדיפות: ${score}/100`}>
          <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${scoreBarColor}`} style={{ width: `${score}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{score}</span>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none shrink-0 mt-0.5">{tMeta.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-black text-white leading-snug">{task.title}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tagColor}`}>{tag}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{reason}</p>
          {task.goalRef ? (
            <p className="text-[11px] text-brand-300 font-semibold mt-1.5 flex items-center gap-1">
              <Target className="w-3 h-3 shrink-0" /> מקדם: {task.goalRef}
            </p>
          ) : (
            <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" /> משימה בלי יעד — ודא שהיא באמת חשובה
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
        {task.status !== 'today' && task.status !== 'doing' && (
          <button
            onClick={() => onMove(task.id, 'today')}
            className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors"
          >
            📌 להיום
          </button>
        )}
        {(task.status === 'today' || task.status === 'week') && (
          <button
            onClick={() => onMove(task.id, 'doing')}
            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            ⚡ התחל עכשיו
          </button>
        )}
        {task.status === 'doing' && (
          <button
            onClick={() => onMove(task.id, 'done')}
            className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-colors"
          >
            ✓ סגור
          </button>
        )}
        <button
          onClick={() => onFocus(task.id)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors"
        >
          🔍 מיקוד
        </button>
      </div>
    </div>
  )
}

// ─── Focus Mode Bar ───────────────────────────────────────────────────────────
function FocusModeBar({ task, onExit }) {
  const tMeta = TYPE_META[task?.type] || TYPE_META.strategy
  const [elapsed, setElapsed] = useState(0)

  // T2-E: live timer in focus bar
  useEffect(() => {
    if (!task?.doingStartedAt) return
    function tick() { setElapsed(Math.floor((Date.now() - new Date(task.doingStartedAt).getTime()) / 1000)) }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [task?.doingStartedAt])

  function fmtElapsed(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="fixed top-0 inset-x-0 z-40 bg-slate-900 border-b border-slate-700 px-4 py-2.5 flex items-center gap-3 shadow-lg">
      <span className="text-lg leading-none shrink-0">{tMeta.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-400 leading-none mb-0.5">מצב מיקוד</p>
        <p className="text-sm font-black text-white truncate">{task?.title}</p>
      </div>
      {task?.doingStartedAt && (
        <span className="text-xs font-black text-purple-300 bg-purple-900/50 px-2.5 py-1 rounded-lg shrink-0">
          ⏱ {fmtElapsed(elapsed)}
        </span>
      )}
      <button
        onClick={onExit}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" /> יציאה
      </button>
    </div>
  )
}

// ─── Big 3 Section ────────────────────────────────────────────────────────────
function Big3Section({ tasks, big3Error }) {
  const big3 = tasks.filter(t => t.isBigThree)

  return (
    <div className="bg-gradient-to-l from-brand-50 to-indigo-50 border border-brand-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-brand-500 fill-brand-500 shrink-0" />
        <span className="text-sm font-black text-slate-800">3 הגדולים של השבוע</span>
        <span className="text-xs text-slate-400 font-medium mr-auto">{big3.length}/3</span>
      </div>

      {big3Error && (
        <div className="mb-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          כבר יש 3 — הסר אחד כדי להוסיף חדש
        </div>
      )}

      {big3.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-1">
          לחץ ★ על משימה כדי להוסיף ל-Big 3
        </p>
      ) : (
        <div className="space-y-2">
          {big3.map((t, i) => {
            const pMeta = PRIORITY_META[normPriority(t.priority)]
            const isDone = t.status === 'done'
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border ${
                  isDone ? 'border-green-200' : 'border-brand-100'
                }`}
              >
                <span className="text-brand-500 font-black w-4 text-center text-sm shrink-0">{i + 1}</span>
                <span className={`flex-1 text-sm font-semibold leading-snug ${
                  isDone ? 'line-through text-slate-400' : 'text-slate-800'
                }`}>
                  {t.title}
                </span>
                {isDone
                  ? <span className="text-green-500 text-sm">✓</span>
                  : <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${pMeta.dot}`} />
                }
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Goals Empty State ────────────────────────────────────────────────────────
function GoalsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="text-6xl mb-5">🎯</div>
      <h2 className="text-xl font-black text-slate-900 mb-2">קודם נגדיר לאן הולכים</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">
        כדי לבנות שבוע חכם, המערכת צריכה לדעת מה היעדים שלך.
        ללא יעדים — הלוח הוא סתם רשימת משימות.
      </p>
      <Link
        to="/goals"
        className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors"
      >
        הגדר יעדים →
      </Link>
      <p className="text-xs text-slate-400 mt-4">5 דקות עכשיו = שבוע ממוקד</p>
    </div>
  )
}

// ─── Weekly Focus Header ──────────────────────────────────────────────────────
function WeeklyFocusHeader({ monthly, tasks }) {
  const mainFocus = useMemo(() => {
    const moves = (monthly?.threeKeyMoves || []).filter(m => m?.trim())
    if (moves[0]) return moves[0]
    if (monthly?.revenueTarget) return `${formatCurrency(monthly.revenueTarget)} הכנסות החודש`
    return null
  }, [monthly])

  if (!mainFocus) return null

  const notDone      = tasks.filter(t => t.status !== 'done')
  const linked       = notDone.filter(t => t.goalRef).length
  const big3Total    = tasks.filter(t => t.isBigThree).length
  const big3Done     = tasks.filter(t => t.isBigThree && t.status === 'done').length
  const nextCritical = tasks.find(t =>
    t.status !== 'done' && t.isBigThree
  ) || tasks.find(t =>
    t.status !== 'done' && normPriority(t.priority) === 'critical'
  )

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
        המיקוד החודשי
      </div>
      <div className="text-sm font-black text-slate-900 mb-3 leading-snug">
        "{mainFocus}"
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
          <div className="text-lg font-black text-slate-800">{linked}/{notDone.length || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">מחוברות ליעד</div>
        </div>
        <div className="bg-brand-50 rounded-xl p-2.5 text-center">
          <div className="text-lg font-black text-brand-700">{big3Done}/{big3Total || 3}</div>
          <div className="text-[10px] text-brand-500 mt-0.5">Big 3 בוצעו</div>
        </div>
        <div className={`rounded-xl p-2.5 text-center ${nextCritical ? 'bg-red-50' : 'bg-green-50'}`}>
          <div className={`text-xs font-black leading-tight line-clamp-2 ${nextCritical ? 'text-red-700' : 'text-green-700'}`}>
            {nextCritical
              ? (nextCritical.title.length > 18 ? nextCritical.title.slice(0, 18) + '…' : nextCritical.title)
              : '✓ הכל הושלם'}
          </div>
          <div className={`text-[10px] mt-0.5 ${nextCritical ? 'text-red-500' : 'text-green-500'}`}>
            {nextCritical ? 'פתוחה עדיין' : 'מושלם!'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Today Focus ──────────────────────────────────────────────────────────────
function TodayFocus({ tasks, onMove, onStartMorningPlan }) {
  const focusTasks = useMemo(() => {
    const notDone = tasks.filter(t => t.status !== 'done')
    // 1. Big 3 currently active (today/doing)
    const big3Active  = notDone.filter(t => t.isBigThree && (t.status === 'today' || t.status === 'doing'))
    // 2. Big 3 waiting (not yet moved to today)
    const big3Waiting = notDone.filter(t => t.isBigThree && t.status !== 'today' && t.status !== 'doing')
    // 3. Critical/high in today or doing (non-Big3) — sort deep energy before quick
    const critical    = notDone.filter(t => !t.isBigThree && normPriority(t.priority) === 'critical' && (t.status === 'today' || t.status === 'doing'))
    const highToday   = notDone.filter(t => !t.isBigThree && normPriority(t.priority) === 'high' && t.status === 'today')
    // T2-B: within each group, deep energy tasks come first
    const sortByEnergy = arr => [...arr.filter(t => t.energyLevel === 'deep'), ...arr.filter(t => t.energyLevel !== 'deep')]
    // Deduplicate by id, cap at 3
    const seen = new Set()
    return [...sortByEnergy(big3Active), ...sortByEnergy(big3Waiting), ...sortByEnergy(critical), ...sortByEnergy(highToday)]
      .filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true })
      .slice(0, 3)
  }, [tasks])

  // T1-C: time budget bar
  const { budgetUsed, budgetOver } = useMemo(() => {
    const todayAndDoing = tasks.filter(t => t.status === 'today' || t.status === 'doing')
    const used = todayAndDoing.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0)
    return { budgetUsed: used, budgetOver: Math.max(0, used - DAILY_CAPACITY_MINUTES) }
  }, [tasks])

  // T2-C: daily intent from localStorage
  const dailyIntent = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('flowos_daily_intent') || 'null')
      if (!raw) return null
      const today = new Date().toDateString()
      return raw.date === today ? raw.text : null
    } catch { return null }
  }, [])

  const todayTasks = tasks.filter(t => t.status === 'today')

  return (
    <div className="bg-slate-900 text-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          היום מתמקדים בזה
        </div>
        {dailyIntent && (
          <div className="text-[10px] text-brand-300 font-semibold max-w-[180px] truncate">
            🎯 {dailyIntent}
          </div>
        )}
      </div>

      {focusTasks.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-sm text-slate-400 mb-3">הלוח נקי — תבחר משימה אחת להיום</p>
          {todayTasks.length === 0 && onStartMorningPlan && (
            <button
              onClick={onStartMorningPlan}
              className="text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl transition-colors"
            >
              ☀️ תכנן את היום
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {focusTasks.map((t, i) => {
            const tMeta   = TYPE_META[t.type] || TYPE_META.strategy
            const isActive = t.status === 'today' || t.status === 'doing'
            const pKey    = normPriority(t.priority)
            return (
              <div key={t.id} className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
                <span className="text-slate-500 font-black text-xs w-4 text-center shrink-0">{i + 1}</span>
                <span className="text-base shrink-0 leading-none">{tMeta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-snug truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {t.isBigThree && <span className="text-[10px] text-brand-300 font-bold">★ Big 3</span>}
                    {t.status === 'doing' && <span className="text-[10px] text-purple-300 font-semibold">⚡ בביצוע</span>}
                    {pKey === 'critical' && <span className="text-[10px] text-red-400 font-semibold">🔴 קריטי</span>}
                    {t.energyLevel === 'deep'  && <span className="text-[10px] text-blue-300">🧠</span>}
                    {t.energyLevel === 'quick' && <span className="text-[10px] text-yellow-300">⚡</span>}
                  </div>
                </div>
                {!isActive ? (
                  <button onClick={() => onMove(t.id, 'today')}
                    className="text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg transition-colors shrink-0">
                    להיום
                  </button>
                ) : t.status === 'today' ? (
                  <button onClick={() => onMove(t.id, 'done')}
                    className="text-[11px] font-bold bg-green-500 hover:bg-green-600 text-white px-2.5 py-1 rounded-lg transition-colors shrink-0">
                    סגור ✓
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* T1-C: Time Budget Bar */}
      {budgetUsed > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400">⏱ תקציב היום</span>
            <span className={`text-[10px] font-black ${budgetOver > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {budgetUsed > 0 && budgetOver > 0
                ? `חריגה ב-${budgetOver} דק׳`
                : `${budgetUsed} / ${DAILY_CAPACITY_MINUTES} דק׳`
              }
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${budgetOver > 0 ? 'bg-amber-400' : 'bg-brand-500'}`}
              style={{ width: `${Math.min(100, (budgetUsed / DAILY_CAPACITY_MINUTES) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────
// ─── Drag & Drop primitives ───────────────────────────────────────────────────

/**
 * Sortable wrapper — makes each TaskCard draggable within its column AND
 * across columns.  Uses @dnd-kit/sortable so cards can be reordered freely.
 * activationConstraint: distance 8px keeps button clicks working normally.
 */
/**
 * SortableTaskWrapper — render-prop pattern.
 * Exposes `dragListeners` so only the GripVertical handle triggers drag.
 * This prevents accidental drag when tapping buttons or scrolling on mobile.
 */
function SortableTaskWrapper({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform:  CSS.Transform.toString(transform ? { ...transform, scaleX: 1, scaleY: 1 } : null),
    transition: isDragging ? undefined : (transition || undefined),
    opacity:    isDragging ? 0 : 1,
    zIndex:     isDragging ? 999 : 'auto',
    position:   'relative',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="select-none cursor-grab active:cursor-grabbing touch-none"
    >
      {typeof children === 'function'
        ? children({ isDragging })
        : children}
    </div>
  )
}

/**
 * Ghost card shown in DragOverlay during an active drag.
 * Intentionally simplified — no interactive elements.
 */
function DragGhost({ task }) {
  if (!task) return null
  const pKey  = normPriority(task.priority)
  const pMeta = PRIORITY_META[pKey] || PRIORITY_META.medium
  const tMeta = TYPE_META[task.type] || TYPE_META.strategy

  const stripColor = task.isBigThree ? 'bg-brand-400'
    : pKey === 'critical' ? 'bg-red-500'
    : pKey === 'high'     ? 'bg-orange-400'
    : pKey === 'medium'   ? 'bg-amber-300'
    : 'bg-slate-200'

  return (
    <div className={`rounded-xl border-2 border-brand-400 shadow-2xl w-72 overflow-hidden rotate-[1.5deg] scale-[1.03] ${
      task.isBigThree ? 'bg-gradient-to-br from-brand-50 to-white' : 'bg-white'
    }`}
      style={{ boxShadow: '0 20px 60px rgba(99,102,241,0.3), 0 8px 24px rgba(0,0,0,0.15)' }}>
      {/* Priority strip */}
      <div className={`h-1 w-full ${stripColor}`} />
      <div className="px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base leading-none">{tMeta.emoji}</span>
          <p className="text-sm font-bold text-slate-800 truncate flex-1">{task.title}</p>
          {task.isBigThree && <span className="text-base leading-none">⭐</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pMeta.bg}`}>{pMeta.label}</span>
          {task.estimatedMinutes && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{task.estimatedMinutes} דק׳
            </span>
          )}
          {task.goalRef && (
            <span className="text-[10px] text-brand-500 font-semibold truncate max-w-[80px]">🎯 {task.goalRef}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({ col, tasks, quarterly, monthly, period, onAdd, onMove, onDelete, onEdit, onUpdate, onToggleBig3, big3Count, focusModeId, onFocus, goalOptions, onBulkMove, isDragActive, onMobileMove }) {
  const colTasks   = tasks.filter(t => t.status === col.id)
  const canAddBig3 = big3Count < 3

  // Droppable zone — id matches column status string
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: col.id })

  // T2-D: bulk selection state
  const [selected,    setSelected]    = useState(() => new Set())
  const [selectMode,  setSelectMode]  = useState(false)

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(colTasks.map(t => t.id)))
  }

  function clearSelection() {
    setSelected(new Set())
    setSelectMode(false)
  }

  function bulkAction(newStatus) {
    if (selected.size === 0) return
    onBulkMove([...selected], newStatus)
    clearSelection()
  }

  function bulkDelete() {
    if (selected.size === 0) return
    ;[...selected].forEach(id => onDelete(id))
    clearSelection()
  }

  // T3-A: goal suggestions for empty/sparse backlog
  const suggestions = useMemo(() => {
    if (col.id !== 'backlog' || colTasks.length >= 3) return []
    const moves = [
      ...(quarterly?.threeKeyMoves || []),
      ...(monthly?.threeKeyMoves   || []),
    ].filter(m => m?.trim())
    const existingTitles = tasks.map(t => t.title?.toLowerCase())
    return moves
      .filter(m => !existingTitles.some(t => t?.includes(m.toLowerCase().slice(0, 8))))
      .slice(0, 3)
      .map((move, i) => ({
        title: move,
        goalRef: move,
        goalType: i < (quarterly?.threeKeyMoves || []).filter(m => m?.trim()).length ? 'quarterly' : 'monthly',
      }))
  }, [col.id, colTasks.length, quarterly, monthly, tasks])

  return (
    <div
      ref={setDropRef}
      onClick={focusModeId ? (e) => { if (e.target === e.currentTarget) onFocus(focusModeId) } : undefined}
      className={`flex flex-col rounded-2xl transition-[box-shadow,background-color] duration-150 ${
        isOver && isDragActive
          ? 'ring-2 ring-brand-400 ring-inset bg-brand-50/40'
          : ''
      }`}
    >
      {/* Header — redesigned with accent bar + personality */}
      <div className={`bg-white border ${col.headerBorder} rounded-xl mb-3 shadow-sm overflow-hidden`}>
        {/* Colored accent bar on top */}
        <div className={`h-1 w-full ${col.accentBar}`} />
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[15px] leading-none">{col.emoji}</span>
            <span className="text-sm font-black text-slate-800">{col.label}</span>
            {/* Live pulse for doing column */}
            {col.liveDot && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* T2-D: select all toggle */}
            {colTasks.length > 0 && !focusModeId && (
              <button
                onClick={() => { if (selectMode) clearSelection(); else { setSelectMode(true); selectAll() } }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                {selectMode ? 'ביטול' : 'בחר הכל'}
              </button>
            )}
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${col.tagBg}`}>{colTasks.length}</span>
          </div>
        </div>
      </div>

      {/* T2-D: bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="mb-3 bg-slate-800 rounded-xl px-3 py-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-300 ml-auto">{selected.size} נבחרו</span>
          <button onClick={() => bulkAction('week')}    className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg transition-colors">לשבוע</button>
          <button onClick={() => bulkAction('today')}   className="text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded-lg transition-colors">להיום</button>
          <button onClick={() => bulkAction('backlog')} className="text-[10px] font-bold bg-slate-600 hover:bg-slate-700 text-white px-2 py-1 rounded-lg transition-colors">לרשימה</button>
          <button onClick={bulkDelete} className="text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg transition-colors">מחק</button>
        </div>
      )}

      {/* Quick add — hidden during focus mode */}
      {col.canAdd && !focusModeId && (
        <div className="mb-3">
          <QuickAddForm colId={col.id} onAdd={onAdd} />
        </div>
      )}

      {/* Tasks — wrapped in SortableContext for within-column reordering */}
      <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1">
          {colTasks.length === 0 && !focusModeId && (
            <div className={`flex items-center justify-center rounded-2xl border-2 border-dashed min-h-[140px] transition-all duration-200 ${
              isOver && isDragActive
                ? 'border-brand-300 bg-brand-50/60 scale-[1.02]'
                : 'border-slate-100 bg-white/50'
            }`}>
              {isOver && isDragActive ? (
                <div className="text-center py-4">
                  <div className="text-2xl mb-1">↓</div>
                  <p className="text-sm font-bold text-brand-500">שחרר כאן</p>
                </div>
              ) : (
                <div className="text-center px-4 py-5 animate-slide-up">
                  <div className="text-2xl mb-2">{col.emptyIcon}</div>
                  <p className="text-xs font-bold text-slate-400 mb-0.5">{col.emptyText}</p>
                  <p className="text-[11px] text-slate-300">{col.emptySub}</p>
                </div>
              )}
            </div>
          )}
          {colTasks.map(task => (
            <SortableTaskWrapper key={task.id} id={task.id}>
              {({ isDragging }) => (
                <>
                  {/* T2-D: selection checkbox overlay */}
                  {selectMode && (
                    <div
                      onClick={e => { e.stopPropagation(); toggleSelect(task.id) }}
                      className="absolute top-2 left-2 z-10 w-4 h-4 rounded border-2 border-brand-400 bg-white cursor-pointer flex items-center justify-center"
                    >
                      {selected.has(task.id) && <Check className="w-2.5 h-2.5 text-brand-600" />}
                    </div>
                  )}
                  <TaskCard
                    task={task}
                    onMove={onMove}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onUpdate={onUpdate}
                    onToggleBig3={onToggleBig3}
                    canAddBig3={canAddBig3}
                    isFocused={focusModeId === task.id}
                    isDimmed={(!!focusModeId && focusModeId !== task.id) || (selectMode && !selected.has(task.id))}
                    onFocus={selectMode ? () => toggleSelect(task.id) : onFocus}
                    goalOptions={goalOptions}
                    isDragActive={isDragActive}
                    onMobileMove={onMobileMove}
                  />
                </>
              )}
            </SortableTaskWrapper>
          ))}
        </div>
      </SortableContext>

      {/* T3-A: goal-driven suggestions in backlog */}
      {suggestions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 mb-2">💡 הצעות מהיעדים</p>
          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <button key={i}
                onClick={() => onAdd({ title: s.title, goalRef: s.goalRef, goalType: s.goalType, status: 'backlog', priority: 'medium', type: 'strategy' })}
                className="w-full text-right text-[11px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 rounded-xl px-3 py-2 transition-colors"
              >
                + {s.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Perfect Day Banner ───────────────────────────────────────────────────────
function PerfectDayBanner({ tasks }) {
  const today    = tasks.filter(t => t.status === 'today')
  const doneTasks = tasks.filter(t => t.status === 'done')
  if (today.length === 0 && doneTasks.length >= 3) return (
    <div className="mb-4 rounded-xl bg-gradient-to-l from-green-600 to-emerald-500 text-white px-4 py-4 text-center shadow-sm">
      <div className="text-3xl mb-1">🌟</div>
      <div className="text-base font-black">יום מושלם!</div>
      <div className="text-sm text-white/80">{doneTasks.length} משימות הושלמו — סיום יום חזק</div>
    </div>
  )
  if (today.length === 1 && doneTasks.length > 0) return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
      <span className="text-2xl shrink-0">⭐</span>
      <div>
        <div className="text-sm font-black text-amber-900">משימה אחת מיום מושלם</div>
        <div className="text-xs text-amber-700">סגור: "{today[0].title}" — ואתה שם.</div>
      </div>
    </div>
  )
  return null
}

// ─── T1-D: Carryover Detection Banner ────────────────────────────────────────
function CarryoverBanner({ tasks, onMove, onDelete }) {
  const THRESHOLD_H = 20
  const DISMISS_KEY = 'flowos_carryover_dismissed'

  const [dismissed, setDismissed] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || 'null')
      return raw?.date === new Date().toDateString()
    } catch { return false }
  })

  const staleTasks = useMemo(() => {
    if (dismissed) return []
    return tasks.filter(t => {
      if (t.status !== 'today' || !t.movedToTodayAt) return false
      const h = (Date.now() - new Date(t.movedToTodayAt).getTime()) / 3_600_000
      return h > THRESHOLD_H
    })
  }, [tasks, dismissed])

  if (dismissed || staleTasks.length === 0) return null

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify({ date: new Date().toDateString() })) } catch {}
    setDismissed(true)
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black text-amber-800">📌 משימות שנגררות מאתמול</span>
        <button onClick={dismiss} className="text-amber-400 hover:text-amber-600"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="space-y-1.5">
        {staleTasks.map(t => (
          <div key={t.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
            <span className="flex-1 text-xs font-semibold text-slate-700 truncate">{t.title}</span>
            <button onClick={() => onMove(t.id, 'week')} className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors shrink-0">לשבוע</button>
            <button onClick={() => onDelete(t.id)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0"><X className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── T2-A: Search + Filter Bar ────────────────────────────────────────────────
function TaskFilterBar({ search, setSearch, activeFilter, setActiveFilter }) {
  const FILTERS = [
    { id: 'all',      label: 'הכל' },
    { id: 'big3',     label: '★ Big 3' },
    { id: 'doing',    label: '⚡ בביצוע' },
    { id: 'noGoal',   label: '🔗 ללא יעד' },
    { id: 'critical', label: '🔴 קריטי' },
  ]

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 shadow-sm mb-4 space-y-2">
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 חיפוש משימות..."
        className="w-full text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200 border border-slate-100"
      />
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setActiveFilter(f.id)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
              activeFilter === f.id
                ? 'bg-brand-600 text-white border-transparent'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
        {(search || activeFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setActiveFilter('all') }}
            className="text-[11px] font-bold text-red-500 hover:text-red-700 px-2 py-1 transition-colors">
            ✕ נקה
          </button>
        )}
      </div>
    </div>
  )
}

// ─── T2-C: Morning Planning Modal ─────────────────────────────────────────────
function MorningPlanModal({ onClose, onAdd, addXP }) {
  const [step, setStep]       = useState(1)
  const [tasks3, setTasks3]   = useState(['', '', ''])
  const [intent, setIntent]   = useState('')
  const [created, setCreated] = useState([])

  // Close on Escape (any step)
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleStep1() {
    const valid = tasks3.filter(t => t.trim())
    if (valid.length === 0) return
    const newTasks = valid.map(title => ({ title: title.trim(), status: 'today', priority: 'medium', type: 'strategy' }))
    setCreated(newTasks)
    setStep(2)
  }

  function handleFinish() {
    // Create tasks
    created.forEach(t => onAdd(t))
    // Save intent
    if (intent.trim()) {
      try {
        localStorage.setItem('flowos_daily_intent', JSON.stringify({ text: intent.trim(), date: new Date().toDateString() }))
      } catch {}
    }
    // XP bonus
    if (addXP) addXP(50)
    onClose()
  }

  const totalMin = created.reduce((s, t) => s + (t.estimatedMinutes || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 px-3 pb-2 md:pb-0 md:px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85dvh] md:max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-black text-slate-900">☀️ תכנון בוקר</h3>
            <p className="text-xs text-slate-400">שלב {step} מתוך 3</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {step === 1 && (
            <>
              <p className="text-sm font-bold text-slate-700">מה 3 הדברים שחייבים לקרות היום?</p>
              {tasks3.map((t, i) => (
                <input key={i}
                  value={t}
                  onChange={e => setTasks3(prev => { const n = [...prev]; n[i] = e.target.value; return n })}
                  onKeyDown={e => { if (e.key === 'Enter' && i < 2) document.getElementById(`mpm-${i+1}`)?.focus() }}
                  id={`mpm-${i}`}
                  placeholder={`משימה ${i + 1}...`}
                  className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              ))}
              <button onClick={handleStep1} disabled={!tasks3.some(t => t.trim())}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-colors">
                הבא →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm font-bold text-slate-700">סיכום — תקציב זמן</p>
              {created.map((t, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm font-semibold text-slate-700">{t.title}</span>
                </div>
              ))}
              {totalMin > 0 && (
                <p className="text-xs text-slate-500">⏱ סה"כ: {totalMin} דקות ({Math.round(totalMin / 60 * 10) / 10} שעות)</p>
              )}
              <button onClick={() => setStep(3)} className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">
                הבא →
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm font-bold text-slate-700">להשלים את המשפט:</p>
              <p className="text-sm text-slate-500">"היום אני מתמקד ב..."</p>
              <input
                autoFocus
                value={intent}
                onChange={e => setIntent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleFinish() }}
                placeholder="לדוגמה: סגירת עסקה עם לקוח X"
                className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <div className="bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 text-xs text-brand-700 font-semibold">
                🎯 +50 XP על תכנון הבוקר!
              </div>
              <button onClick={handleFinish} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors">
                ✓ יאללה, בואנה!
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Undo Toast ───────────────────────────────────────────────────────────────
// Shows a floating toast with a 5-second countdown to undo delete/move actions.
function UndoToast({ toasts, onUndo, onDismiss }) {
  if (toasts.length === 0) return null
  const toast = toasts[0]  // always show the most recent action

  return (
    <div className="fixed bottom-20 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-white/10 animate-in slide-in-from-bottom-2">
        <span className="truncate max-w-[200px] text-slate-200">{toast.message}</span>
        <button
          onClick={() => onUndo(toast)}
          className="text-brand-300 hover:text-brand-200 font-black whitespace-nowrap transition-colors shrink-0"
        >
          ↩ בטל
        </button>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-500 hover:text-white transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Anti-Noise Panel ─────────────────────────────────────────────────────────
function AntiNoisePanel({ tasks, onMove, onDelete, onEdit }) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem('flowos_noise_dismissed') || '{}')
      return new Set(d.ids || [])
    } catch { return new Set() }
  })

  const noiseItems = useMemo(() => {
    const items = detectNoise(tasks)
    return items.filter(i => !dismissed.has(i.task.id))
  }, [tasks, dismissed])

  const score = useMemo(() => noiseScore(tasks), [tasks])

  const dismiss = (id) => {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    localStorage.setItem('flowos_noise_dismissed', JSON.stringify({ ids: [...next] }))
  }

  if (score.total === 0) return null

  const badgeColor = score.high > 0 ? 'bg-red-500' : score.medium > 0 ? 'bg-amber-500' : 'bg-slate-400'

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header — always visible */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🔍</span>
          <span className="text-xs font-bold text-slate-700">רעש במערכת</span>
          <span className={`text-[10px] font-black text-white px-1.5 py-0.5 rounded-full ${badgeColor}`}>
            {noiseItems.length}
          </span>
        </div>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {/* Noise items list */}
      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {noiseItems.length === 0 && (
            <p className="px-4 py-3 text-xs text-slate-400 text-center">הכל נקי ✨</p>
          )}
          {noiseItems.map(({ task, type, label, description, action, actionStatus, severity }) => {
            const severityDot = severity === 'high' ? 'bg-red-400' : severity === 'medium' ? 'bg-amber-400' : 'bg-slate-300'
            return (
              <div key={task.id} className="flex items-start gap-3 px-4 py-2.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${severityDot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-700 truncate">{task.title}</p>
                  <p className="text-[10px] text-slate-400">{label} · {description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {actionStatus && (
                    <button
                      onClick={() => { onMove(task.id, actionStatus); dismiss(task.id) }}
                      className="text-[10px] font-bold text-white bg-slate-600 hover:bg-slate-700 px-2 py-1 rounded-lg transition-colors"
                    >
                      {action}
                    </button>
                  )}
                  {type === 'no-goal' && (
                    <button
                      onClick={() => { onEdit(task); dismiss(task.id) }}
                      className="text-[10px] font-bold text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded-lg transition-colors"
                    >
                      חבר יעד
                    </button>
                  )}
                  <button
                    onClick={() => dismiss(task.id)}
                    className="text-slate-300 hover:text-slate-500 p-1"
                    title="הסתר"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
          {noiseItems.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 flex justify-end">
              <button
                onClick={() => {
                  const all = new Set(noiseItems.map(i => i.task.id))
                  const next = new Set([...dismissed, ...all])
                  setDismissed(next)
                  localStorage.setItem('flowos_noise_dismissed', JSON.stringify({ ids: [...next] }))
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
              >
                הסתר הכל
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Near Win Banner (brain-driven) ──────────────────────────────────────────
// ─── State-driven banner (replaces WeeklyNearWinBanner for Scattered/NearWin/Overloaded) ──
function WeeklyStateBanner({ brain, tasks, onMove }) {
  const [dismissed, setDismissed] = useState(false)
  if (!brain || dismissed) return null

  const { userMode } = brain
  const doingTasks = tasks.filter(t => t.status === 'doing')
  const todayOpen  = tasks.filter(t => t.status === 'today')

  // Scattered: many open, nothing getting done
  if (userMode === 'Scattered' && (doingTasks.length + todayOpen.length) > 4) {
    const best = doingTasks[0] || todayOpen[0]
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-black text-red-800">
              ⚠️ מפוזר — {doingTasks.length + todayOpen.length} משימות פתוחות
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              יותר מדי פתוח הורס ביצוע. בחר אחת ורק אחת. שאר — לשבוע.
            </p>
          </div>
          <button onClick={() => setDismissed(true)} className="text-red-300 hover:text-red-500 shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        {best && (
          <button
            onClick={() => { onMove(best.id, 'doing'); setDismissed(true) }}
            className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            ⚡ התמקד ב: {best.title.slice(0, 35)}{best.title.length > 35 ? '…' : ''}
          </button>
        )}
      </div>
    )
  }

  // Near Win: push for finish
  if (userMode === 'NearWin') {
    const remaining = todayOpen.length + doingTasks.length
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-green-800">
            🏁 {remaining === 1 ? 'משימה אחת מיום מנצח' : `${remaining} משימות מיום מנצח`}
          </p>
          <p className="text-xs text-green-700 mt-0.5">אל תעצור עכשיו. דחה כל שאר לאחר.</p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-green-300 hover:text-green-500 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Default: show normal near-win hints
  return <WeeklyNearWinBanner brain={brain} />
}

function WeeklyNearWinBanner({ brain }) {
  if (!brain) return null
  const { nearWinHints, userMode, executionPattern } = brain
  const showHints = (userMode === 'NearWin' || userMode === 'Momentum') && nearWinHints?.length > 0

  return (
    <div className="flex flex-col gap-3">
      {/* Execution pattern chip — always shown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black uppercase tracking-widest ${executionPattern.color}`}>
            {executionPattern.emoji} דפוס ביצוע: {executionPattern.label}
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {brain.modeEmoji} {brain.modeLabel}
        </span>
      </div>

      {/* Near win hints */}
      {showHints && (
        <div className="rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3">
          <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">
            🏁 מה יסגור את השבוע
          </p>
          <div className="space-y-1.5">
            {nearWinHints.map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 text-base leading-none mt-0.5">{h.icon}</span>
                <p className="text-xs font-semibold text-green-900 leading-snug">{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Goals check ──────────────────────────────────────────────────────────────
function checkHasGoals(monthly, quarterly) {
  const monthlyMoves   = (monthly?.threeKeyMoves  || []).filter(m => m?.trim())
  const quarterlyMoves = (quarterly?.threeKeyMoves || []).filter(m => m?.trim())
  return (
    monthlyMoves.length > 0 || quarterlyMoves.length > 0 ||
    (monthly?.revenueTarget > 0) || (quarterly?.revenueTarget > 0)
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Weekly() {
  const { tasks, addTask, updateTask, deleteTask, moveTask, setBigThree, bulkMoveTask, reorderTasks, restoreTask, monthly, quarterly, profile, awardXP } = useStore()
  const period = usePeriod()
  const [activeTab,      setActiveTab]     = useState('backlog')
  const [editingTask,    setEditing]       = useState(null)
  const [big3Error,      setBig3Error]     = useState(false)
  const [focusModeId,    setFocusMode]     = useState(null)
  const [showClose,      setShowClose]     = useState(false)
  const [showMorning,    setShowMorning]   = useState(false)   // T2-C
  const [search,         setSearch]        = useState('')      // T2-A
  const [activeFilter,   setActiveFilter]  = useState('all')   // T2-A
  const [showCelebration, setShowCelebration] = useState(false)
  const [mobileMovingTask, setMobileMovingTask] = useState(null)  // mobile move sheet

  // ── Undo Toast ──────────────────────────────────────────────────────────
  const [undoQueue,  setUndoQueue]  = useState([])
  const undoTimers = useRef({})

  function pushUndo({ message, undo }) {
    const id = Date.now().toString()
    setUndoQueue(prev => [{ id, message, undo }, ...prev].slice(0, 3))
    undoTimers.current[id] = setTimeout(() => dismissUndo(id), 5000)
  }

  function dismissUndo(id) {
    clearTimeout(undoTimers.current[id])
    delete undoTimers.current[id]
    setUndoQueue(prev => prev.filter(t => t.id !== id))
  }

  function applyUndo(toast) {
    dismissUndo(toast.id)
    toast.undo()
  }

  // Undo-aware delete — stores the full task snapshot
  function handleDeleteTask(id) {
    const task = tasks.find(t => t.id === id)
    if (!task) { deleteTask(id); return }
    deleteTask(id)
    pushUndo({
      message: `"${task.title.slice(0, 35)}" נמחקה`,
      undo: () => restoreTask(task),
    })
  }

  // Undo-aware move — stores the previous status + field snapshots
  function handleMoveWithUndo(id, newStatus) {
    const task = tasks.find(t => t.id === id)
    if (!task) { handleMoveTask(id, newStatus); return }
    const prevSnapshot = {
      status:         task.status,
      completedAt:    task.completedAt,
      doingStartedAt: task.doingStartedAt,
      movedToTodayAt: task.movedToTodayAt,
      actualMinutes:  task.actualMinutes,   // restore elapsed time on undo
      touchCount:     task.touchCount,
    }
    handleMoveTask(id, newStatus)
    if (newStatus === 'done') {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 1800)
    }
    const colLabel = COLUMNS.find(c => c.id === newStatus)?.label ?? newStatus
    pushUndo({
      message: `"${task.title.slice(0, 28)}" → ${colLabel}`,
      undo: () => updateTask(id, prevSnapshot),
    })
  }

  const big3Count  = tasks.filter(t => t.isBigThree).length
  const hasGoals   = checkHasGoals(monthly, quarterly)
  const focusTask  = focusModeId ? tasks.find(t => t.id === focusModeId) : null

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const [activeDragId, setActiveDragId] = useState(null)
  const activeDragTask = activeDragId ? tasks.find(t => t.id === activeDragId) : null

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Small movement threshold — drag only starts from the GripVertical handle
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      // 250ms hold on mobile — prevents carousel scroll from stealing the drag
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
  )

  function handleDragStart({ active }) {
    setActiveDragId(active.id)
  }

  // onDragOver — tracks the current hover target so handleDragEnd can use it
  // as a fallback when the pointer releases over the column background (not on a task).
  // No store mutations here — just records the latest valid column target.
  const dragOverColumnRef = useRef(null)

  function handleDragOver({ active, over }) {
    if (!over) { dragOverColumnRef.current = null; return }
    const overId = over.id
    const overIsColumn = COLUMNS.some(c => c.id === overId)
    if (overIsColumn) {
      dragOverColumnRef.current = overId
      return
    }
    // over a task — record its column as the current target
    const overTask = tasks.find(t => t.id === overId)
    if (overTask) dragOverColumnRef.current = overTask.status
  }

  function handleDragEnd({ active, over }) {
    setActiveDragId(null)

    const activeId   = active.id
    const activeTask = tasks.find(t => t.id === activeId)
    if (!activeTask) { dragOverColumnRef.current = null; return }

    // Resolve drop target:
    //   1. over.id is a column id       → dropped on empty column droppable
    //   2. over.id is a task id         → dropped on / between another task
    //   3. over is null                 → fallback: last valid column from onDragOver
    let targetColumn = activeTask.status  // default: no move
    let overId       = over?.id ?? null

    if (overId) {
      const overIsColumn = COLUMNS.some(c => c.id === overId)
      const overTask     = overIsColumn ? null : tasks.find(t => t.id === overId)
      if (overIsColumn) {
        targetColumn = overId
      } else if (overTask) {
        targetColumn = overTask.status
      }
    } else if (dragOverColumnRef.current) {
      // Pointer released over column background (between tasks) — use last tracked column
      targetColumn = dragOverColumnRef.current
    }

    dragOverColumnRef.current = null

    if (targetColumn !== activeTask.status) {
      // ── Cross-column move ─────────────────────────────────────────────────
      handleMoveWithUndo(activeId, targetColumn)
      return
    }

    // ── Same-column reorder (over.id is a task in the same column) ────────
    if (!overId || overId === activeId) return
    const sameColAll = tasks.filter(t => t.status === activeTask.status)
    const oldIdx = sameColAll.findIndex(t => t.id === activeId)
    const newIdx = sameColAll.findIndex(t => t.id === overId)
    if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return

    const reordered  = arrayMove(sameColAll, oldIdx, newIdx)
    const otherTasks = tasks.filter(t => t.status !== activeTask.status)
    reorderTasks([...otherTasks, ...reordered])
  }

  function handleDragCancel() {
    setActiveDragId(null)
    dragOverColumnRef.current = null
  }

  // Flow Brain
  const brain = useMemo(() => getFlowBrainState({ profile, quarterly, monthly, tasks }), [profile, quarterly, monthly, tasks])

  // T3-C: goal options (same as TaskModal, computed once and passed down)
  const goalOptions = useMemo(() => {
    const opts = [{ value: '', type: 'none', label: 'ללא יעד' }]
    ;(quarterly?.threeKeyMoves || []).forEach(move => {
      if (move?.trim()) opts.push({ value: move, type: 'quarterly', label: `${period?.quarter || 'Q'} · ${move}` })
    })
    ;(monthly?.threeKeyMoves || []).forEach(move => {
      if (move?.trim()) opts.push({ value: move, type: 'monthly', label: `${period?.month || 'חודש'} · ${move}` })
    })
    return opts
  }, [quarterly, monthly, period])

  // T2-A: filtered tasks for Kanban columns (smart panels always use raw `tasks`)
  const displayTasks = useMemo(() => {
    let result = tasks
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.goalRef?.toLowerCase().includes(q)
      )
    }
    switch (activeFilter) {
      case 'big3':     result = result.filter(t => t.isBigThree); break
      case 'doing':    result = result.filter(t => t.status === 'doing'); break
      case 'noGoal':   result = result.filter(t => !t.goalRef && t.status !== 'done'); break
      case 'critical': result = result.filter(t => normPriority(t.priority) === 'critical'); break
    }
    return result
  }, [tasks, search, activeFilter])

  function handleToggleBig3(task, canAdd) {
    if (!task.isBigThree && !canAdd) {
      setBig3Error(true)
      setTimeout(() => setBig3Error(false), 3000)
      return
    }
    setBigThree(task.id, !task.isBigThree)
  }

  function handleFocus(id) {
    setFocusMode(prev => prev === id ? null : id)   // toggle off if same task clicked
  }

  // ── Capacity-aware moveTask ───────────────────────────────────────────────
  // Soft warning when moving task to Today would exceed capacity.
  // Hard block is intentionally NOT implemented — trust the user, warn loudly.
  const [capacityWarning, setCapacityWarning] = useState(null)  // { taskId, over }

  function handleMoveTask(id, newStatus) {
    if (newStatus === 'today' || newStatus === 'doing') {
      const currentLoad = tasks
        .filter(t => (t.status === 'today' || t.status === 'doing') && t.id !== id)
        .reduce((s, t) => s + (t.estimatedMinutes || 0), 0)
      const task = tasks.find(t => t.id === id)
      const taskMins = task?.estimatedMinutes || 0
      const newLoad  = currentLoad + taskMins
      if (newLoad > DAILY_CAPACITY_MINUTES && taskMins > 0) {
        setCapacityWarning({ taskId: id, over: newLoad - DAILY_CAPACITY_MINUTES, newStatus })
        return   // block until user confirms
      }
    }
    moveTask(id, newStatus)
  }

  function confirmCapacityMove() {
    if (!capacityWarning) return
    handleMoveWithUndo(capacityWarning.taskId, capacityWarning.newStatus)
    setCapacityWarning(null)
  }

  const colProps = { tasks: displayTasks, monthly, quarterly, period, onAdd: addTask, onMove: handleMoveWithUndo, onDelete: handleDeleteTask, onEdit: setEditing, onUpdate: updateTask, onToggleBig3: handleToggleBig3, big3Count, focusModeId, onFocus: handleFocus, goalOptions, onBulkMove: bulkMoveTask, isDragActive: !!activeDragId, onMobileMove: (id) => setMobileMovingTask(tasks.find(t => t.id === id) || null) }

  // ── Body scroll lock when any modal is open ─────────────────────────────
  const anyModalOpen = !!(editingTask || showClose || showMorning || capacityWarning)
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [anyModalOpen])

  // ── Escape key for capacity warning modal ────────────────────────────────
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && capacityWarning) setCapacityWarning(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [capacityWarning])

  return (
    <div dir="rtl" className={`min-h-screen bg-gradient-to-b from-slate-50 to-white ${focusModeId ? 'pt-14' : ''}`}>
      {/* Focus mode bar — fixed at top */}
      {focusTask && <FocusModeBar task={focusTask} onExit={() => setFocusMode(null)} />}

      <TopBar title="ניהול שבועי" subtitle={`${period.month} · ${period.weekLabel}`} />

      {/* Mobile vision context bar — premium dark strip */}
      {!focusModeId && monthly?.threeKeyMoves?.[0] && (
        <div className="md:hidden bg-gradient-to-l from-slate-900 via-brand-900/90 to-slate-900 text-white px-4 py-2.5 flex items-center gap-2.5 border-b border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0 animate-pulse" />
          <span className="text-xs font-bold text-slate-200 truncate flex-1">{monthly.threeKeyMoves[0]}</span>
          <span className="text-[10px] text-brand-400 font-black shrink-0 tracking-wide">המיקוד</span>
        </div>
      )}

      {/* ── Goals Gate ───────────────────────────────────────────────────── */}
      {!hasGoals ? <GoalsEmptyState /> : (
      <>
      <div className="px-4 md:px-6 py-4 max-w-6xl mx-auto">

        {/* Weekly Focus Header — hidden during focus mode */}
        {!focusModeId && (
          <div className="mb-4">
            <WeeklyFocusHeader monthly={monthly} tasks={tasks} />
          </div>
        )}

        {/* T1-D: Carryover detection banner */}
        {!focusModeId && (
          <CarryoverBanner tasks={tasks} onMove={handleMoveWithUndo} onDelete={handleDeleteTask} />
        )}

        {/* Execution Pulse + Progress — hidden during focus mode */}
        {!focusModeId && (
          <>
            <div className="mb-2"><ExecutionPulse tasks={tasks} /></div>
            <div className="mb-4"><WeeklyProgress tasks={tasks} onCloseWeek={() => setShowClose(true)} /></div>
          </>
        )}

        {/* Brain: State-driven intervention banner */}
        {!focusModeId && tasks.length > 0 && (
          <div className="mb-4">
            <WeeklyStateBanner brain={brain} tasks={tasks} onMove={handleMoveWithUndo} />
          </div>
        )}

        {/* Pressure Banner — shows red/amber alert when truly behind */}
        {!focusModeId && (
          <div className="mb-4">
            <PressureBanner tasks={tasks} onMove={handleMoveWithUndo} />
          </div>
        )}

        {/* ▶ Next Best Task — always visible (also useful in focus as the action anchor) */}
        <div className="mb-4">
          <NextBestTask tasks={tasks} onMove={handleMoveWithUndo} onFocus={handleFocus} />
        </div>

        {/* Big 3 */}
        {!focusModeId && <div className="mb-4"><Big3Section tasks={tasks} big3Error={big3Error} /></div>}

        {/* Today Focus — hidden during focus mode */}
        {!focusModeId && (
          <div className="mb-4">
            <TodayFocus tasks={tasks} onMove={handleMoveWithUndo} onStartMorningPlan={() => setShowMorning(true)} />
          </div>
        )}

        {/* Perfect day */}
        {!focusModeId && <PerfectDayBanner tasks={tasks} />}

        {/* Anti-Noise Panel — surface cluttered/stale tasks */}
        {!focusModeId && tasks.length > 3 && (
          <div className="mb-4">
            <AntiNoisePanel
              tasks={tasks}
              onMove={handleMoveWithUndo}
              onDelete={handleDeleteTask}
              onEdit={setEditing}
            />
          </div>
        )}

        {/* T2-A: Search + Filter Bar */}
        {!focusModeId && (
          <TaskFilterBar search={search} setSearch={setSearch} activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        )}

        {/* ── Kanban Board — wrapped in DndContext ─────────────────────── */}
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollision}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {/* Desktop: 5-column grid */}
          <div className="hidden md:grid grid-cols-5 gap-4">
            {COLUMNS.map(col => <Column key={col.id} col={col} {...colProps} />)}
          </div>

          {/* Mobile: single-column tab view — no horizontal scroll, drag works natively */}
          <div className="md:hidden">
            {/* Column tab bar */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 mb-3 gap-0.5">
              {COLUMNS.map(col => {
                const count = displayTasks.filter(t => t.status === col.id).length
                return (
                  <button
                    key={col.id}
                    onClick={() => setActiveTab(col.id)}
                    className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-lg transition-all duration-150 ${
                      activeTab === col.id
                        ? `${col.tagBg} shadow-sm`
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span className="text-base leading-none">{col.emoji}</span>
                    <span className={`text-[9px] font-black mt-0.5 ${activeTab === col.id ? '' : 'text-slate-400'}`}>{col.label}</span>
                    {count > 0 && (
                      <span className={`text-[8px] font-bold rounded-full px-1 mt-0.5 ${activeTab === col.id ? 'bg-white/60' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                    )}
                  </button>
                )
              })}
            </div>
            {/* Active column — full width, drag works without carousel interference */}
            {COLUMNS.map(col => (
              <div key={col.id} className={col.id === activeTab ? '' : 'hidden'}>
                <Column col={col} {...colProps} />
              </div>
            ))}
          </div>

          {/* Ghost card shown while dragging */}
          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeDragTask ? <DragGhost task={activeDragTask} /> : null}
          </DragOverlay>
        </DndContext>

        <div className="h-8" />
      </div>

      {/* Capacity warning confirmation */}
      {capacityWarning && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" dir="rtl">
            <p className="text-base font-black text-slate-800 mb-1">⚠️ חריגה מקיבולת היום</p>
            <p className="text-sm text-slate-600 mb-4">
              הוספת משימה זו תגרום לחריגה של <strong>{capacityWarning.over} דקות</strong> מעבר לקיבולת היומית ({DAILY_CAPACITY_MINUTES} דק׳).
              <br />האם להוסיף בכל זאת?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmCapacityMove}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors"
              >
                הוסף בכל זאת
              </button>
              <button
                onClick={() => setCapacityWarning(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                בטל
              </button>
            </div>
          </div>
        </div>
      )}

      {/* T2-C: Morning Planning Modal */}
      {showMorning && (
        <MorningPlanModal
          onClose={() => setShowMorning(false)}
          onAdd={addTask}
          addXP={awardXP}
        />
      )}

      {/* Close week modal */}
      {showClose && (
        <CloseWeekModal
          tasks={tasks}
          period={period}
          onClose={() => setShowClose(false)}
          onMoveTask={handleMoveWithUndo}
          onDeleteTask={handleDeleteTask}
          profile={profile}
        />
      )}

      {/* Task modal */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          quarterly={quarterly}
          monthly={monthly}
          period={period}
          big3Count={big3Count}
          onSave={(id, updates) => updateTask(id, updates)}
          onDelete={id => { handleDeleteTask(id); setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Undo Toast — floats above bottom nav */}
      <UndoToast toasts={undoQueue} onUndo={applyUndo} onDismiss={dismissUndo} />

      {/* ── Task completion celebration flash ── */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-[300] overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-8xl animate-bounce">✅</div>
          </div>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-lg animate-slide-up">
            +10 XP 🔥
          </div>
        </div>
      )}

      {/* ── Mobile Move Bottom Sheet ── */}
      {mobileMovingTask && (
        <div className="fixed inset-0 z-[500] md:hidden" onClick={() => setMobileMovingTask(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl px-4 pt-3 pb-10 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            {/* Task title */}
            <p className="text-sm font-black text-slate-800 text-center mb-0.5 truncate px-4">{mobileMovingTask.title}</p>
            <p className="text-xs text-slate-400 text-center mb-4">העבר לעמודה:</p>
            {/* Column grid */}
            <div className="grid grid-cols-5 gap-2">
              {COLUMNS.map(col => (
                <button
                  key={col.id}
                  onClick={() => {
                    if (col.id !== mobileMovingTask.status) handleMoveWithUndo(mobileMovingTask.id, col.id)
                    setMobileMovingTask(null)
                  }}
                  className={`flex flex-col items-center py-3 px-1 rounded-xl border-2 transition-colors active:scale-95 ${
                    mobileMovingTask.status === col.id
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-slate-200 bg-slate-50 active:border-brand-300 active:bg-brand-50'
                  }`}
                >
                  <span className="text-2xl leading-none mb-1">{col.emoji}</span>
                  <span className="text-[9px] font-bold text-slate-700 text-center leading-tight">{col.label}</span>
                  {mobileMovingTask.status === col.id && (
                    <span className="text-[8px] text-brand-500 font-bold mt-0.5">כאן</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
