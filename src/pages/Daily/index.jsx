/**
 * Daily Execution View — the cockpit.
 *
 * One screen. One task. Today's list. Nothing else.
 * This is where execution actually happens — not the Kanban.
 *
 * Zones:
 *   TOP    — Next best task + first action (the directive)
 *   MIDDLE — Today's list ordered by execution score
 *   BOTTOM — Execution pulse + capacity + flow state
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, Plus, ChevronRight, Zap, Target,
  AlertTriangle, Clock, LayoutGrid, X, Star,
} from 'lucide-react'
import TopBar from '../../components/layout/TopBar.jsx'
import { useStore } from '../../hooks/useStore.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import { getNextBestTask, computeExecutionScore, rankTasksForToday } from '../../engine/executionEngine.js'
import { getFlowBrainState } from '../../utils/flowBrain.js'
import { DAILY_CAPACITY_MINUTES as DAILY_CAPACITY } from '../../constants/app.js'
import { startOfToday } from '../../utils/tasks.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMins(m) {
  if (!m) return null
  if (m < 60) return `${m} דק׳`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}ש׳ ${r}דק׳` : `${h}ש׳`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'בוקר טוב'
  if (h < 17) return 'אחה"צ טוב'
  return 'ערב טוב'
}

// ─── Goal tension bar ─────────────────────────────────────────────────────────
function GoalTensionBar({ task, quarterly, monthly }) {
  const goalText = task.goalRef
  if (!goalText) return null

  // Find the matching key move and compute progress
  const allMoves = [
    ...(quarterly?.threeKeyMoves || []).map(m => ({ move: m, type: 'quarterly' })),
    ...(monthly?.threeKeyMoves   || []).map(m => ({ move: m, type: 'monthly' })),
  ].filter(x => x.move?.trim())

  const match = allMoves.find(x =>
    x.move.toLowerCase().includes(goalText.toLowerCase().slice(0, 10)) ||
    goalText.toLowerCase().includes(x.move.toLowerCase().slice(0, 10))
  )

  const label = match?.move || goalText
  const typeLabel = match?.type === 'quarterly' ? 'רבעוני' : 'חודשי'
  const typeColor = match?.type === 'quarterly' ? 'text-purple-600' : 'text-blue-600'

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <Target className="w-2.5 h-2.5 text-slate-400 shrink-0" />
      <span className="text-[10px] text-slate-400">מקדם</span>
      <span className={`text-[10px] font-bold truncate ${typeColor}`}>{label}</span>
      <span className={`text-[9px] font-bold px-1 py-0.5 rounded bg-slate-100 ${typeColor}`}>{typeLabel}</span>
    </div>
  )
}

// ─── Execution Pulse bar ──────────────────────────────────────────────────────
function ExecutionPulse({ tasks }) {
  const todayDone = useMemo(() => {
    const sot = startOfToday()
    return tasks.filter(t => t.completedAt && new Date(t.completedAt) >= sot)
  }, [tasks])

  const todayTotal = useMemo(() => {
    const sot = startOfToday()
    return tasks.filter(t =>
      t.status === 'today' || t.status === 'doing' ||
      (t.completedAt && new Date(t.completedAt) >= sot)
    )
  }, [tasks])

  const pct = todayTotal.length > 0
    ? Math.round((todayDone.length / todayTotal.length) * 100)
    : 0

  const committedMins = useMemo(() =>
    tasks
      .filter(t => t.status === 'today' || t.status === 'doing')
      .reduce((s, t) => s + (t.estimatedMinutes || t.effortMinutes || 0), 0)
  , [tasks])

  const capacityPct  = Math.min(100, Math.round((committedMins / DAILY_CAPACITY) * 100))
  const overCapacity = committedMins > DAILY_CAPACITY
  const capacityColor = overCapacity ? 'text-red-600' : capacityPct > 80 ? 'text-amber-600' : 'text-slate-500'

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
      {/* Completion blocks */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1 flex-1">
          {todayTotal.length === 0
            ? <span className="text-xs text-slate-300">אין משימות להיום עדיין</span>
            : todayTotal.map((t, i) => (
              <div
                key={t.id}
                className={`h-2 rounded-sm flex-1 transition-all duration-500 ${
                  todayDone.some(d => d.id === t.id)
                    ? 'bg-green-500'
                    : t.status === 'doing'
                    ? 'bg-purple-400 animate-pulse'
                    : 'bg-slate-200'
                }`}
                title={t.title}
              />
            ))
          }
        </div>
        <span className="text-xs font-black text-slate-700 shrink-0">
          {todayDone.length}/{todayTotal.length}
        </span>
      </div>

      {/* Capacity + pct */}
      <div className="flex items-center justify-between text-[10px]">
        <span className={`font-semibold ${capacityColor}`}>
          {overCapacity
            ? `⚠ חריגה ב-${committedMins - DAILY_CAPACITY} דק׳`
            : `⏱ ${committedMins} / ${DAILY_CAPACITY} דק׳ קיבולת`
          }
        </span>
        <span className="text-slate-400">{pct}% הושלם היום</span>
      </div>
    </div>
  )
}

// ─── Flow State Banner ────────────────────────────────────────────────────────
function FlowStateBanner({ brain, tasks, onMove }) {
  const [dismissed, setDismissed] = useState(false)
  if (!brain || dismissed) return null

  const { userMode, executionPattern } = brain

  // Scattered: many open tasks, nothing completing
  if (userMode === 'Scattered') {
    const best = tasks.filter(t => t.status === 'today' || t.status === 'doing')[0]
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <p className="text-sm font-black text-red-800">מפוזר — יותר מדי פתוח</p>
          </div>
          <button onClick={() => setDismissed(true)} className="text-red-300 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-red-700">
          {brain.executionPattern?.label === 'Firefighter'
            ? 'אתה מתמודד עם שריפות במקום לבנות. בחר אחת ורק אחת.'
            : 'יותר מדי פתוח מונע ביצוע. סגור אחת לפני שתפתח חדשה.'
          }
        </p>
        {best && (
          <button
            onClick={() => onMove(best.id, 'doing')}
            className="self-start text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
          >
            ⚡ התחל: {best.title.slice(0, 30)}{best.title.length > 30 ? '...' : ''}
          </button>
        )}
      </div>
    )
  }

  // Near Win: close to completion
  if (userMode === 'NearWin') {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-green-800">🏁 קרוב לסיום — אל תעצור</p>
          <p className="text-xs text-green-700 mt-0.5">עוד קצת ויש לך יום מנצח. דחה הכל לאחר.</p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-green-300 hover:text-green-500 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Overloaded
  if (userMode === 'Overloaded') {
    return (
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-amber-800">🌊 עומס יתר — יש יותר מדי על הצלחת</p>
          <p className="text-xs text-amber-700 mt-0.5">עבור ל<strong>לוח המלא</strong> והוצא משימות לשבוע.</p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-300 hover:text-amber-500 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return null
}

// ─── Next Task Directive ───────────────────────────────────────────────────────
function NextDirective({ tasks, onMove, onDone, quarterly, monthly }) {
  const result = useMemo(() => getNextBestTask(tasks), [tasks])

  if (!result) return (
    <div className="bg-slate-900 rounded-2xl px-5 py-6 text-center">
      <div className="text-3xl mb-2">✨</div>
      <p className="text-white font-bold">אין משימות פתוחות</p>
      <p className="text-slate-400 text-sm mt-1">הוסף משימות ל"היום" כדי להתחיל</p>
    </div>
  )

  const { task, reason, score } = result
  const scoreBarW = `${score}%`
  const scoreColor = score >= 80 ? '#4ade80' : score >= 55 ? '#fbbf24' : '#94a3b8'

  return (
    <div className="bg-slate-900 rounded-2xl px-5 py-5 shadow-lg">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          ▶ זה הדבר הבא שלך
        </span>
        {/* Score bar */}
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: scoreBarW, backgroundColor: scoreColor }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono">{score}</span>
        </div>
      </div>

      {/* Task title */}
      <p className="text-lg font-black text-white leading-snug mb-1">{task.title}</p>

      {/* Context row */}
      <p className="text-xs text-slate-400 mb-1">{reason}</p>
      <GoalTensionBar task={task} quarterly={quarterly} monthly={monthly} />

      {/* First action (if set) */}
      {task.firstAction && (
        <div className="mt-3 bg-white/5 rounded-xl px-3 py-2">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">צעד ראשון</p>
          <p className="text-xs text-white/90">{task.firstAction}</p>
        </div>
      )}

      {/* Meta chips */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {task.estimatedMinutes && (
          <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
            ⏱ {fmtMins(task.estimatedMinutes)}
          </span>
        )}
        {task.energyLevel && (
          <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
            {task.energyLevel === 'deep' ? '🧠 עמוק' : '⚡ מהיר'}
          </span>
        )}
        {task.isBigThree && (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
            ★ Big 3
          </span>
        )}
      </div>

      {/* CTA buttons */}
      <div className="flex gap-2 mt-4">
        {task.status !== 'doing' && (
          <button
            onClick={() => onMove(task.id, 'doing')}
            className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-black rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4" /> התחל עכשיו
          </button>
        )}
        {task.status === 'doing' && (
          <button
            onClick={() => onDone(task.id)}
            className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-black rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> סיימתי ✓
          </button>
        )}
        {task.status !== 'today' && task.status !== 'doing' && (
          <button
            onClick={() => onMove(task.id, 'today')}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-xl transition-colors"
          >
            📌 להיום
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Today Task Row ────────────────────────────────────────────────────────────
function TodayRow({ task, onDone, onMove, isActive, quarterly, monthly }) {
  const [expanded, setExpanded] = useState(false)
  const score = useMemo(() => computeExecutionScore(task), [task])

  const statusDot =
    task.status === 'doing'
      ? 'bg-purple-500 animate-pulse'
      : task.status === 'done'
      ? 'bg-green-500'
      : 'bg-slate-200'

  const rowOpacity = task.status === 'done' ? 'opacity-50' : 'opacity-100'

  return (
    <div className={`transition-all duration-300 ${rowOpacity}`}>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors ${
          isActive ? 'bg-brand-50 border border-brand-100' : ''
        }`}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Done toggle */}
        <button
          onClick={e => { e.stopPropagation(); onDone(task.id) }}
          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
            task.status === 'done'
              ? 'bg-green-500 border-green-500'
              : 'border-slate-300 hover:border-green-400'
          }`}
        >
          {task.status === 'done' && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Status dot */}
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />

        {/* Title */}
        <span className={`flex-1 text-sm font-semibold truncate ${
          task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'
        }`}>
          {task.isBigThree && <Star className="w-3 h-3 inline fill-amber-400 text-amber-400 ml-1 mb-0.5" />}
          {task.title}
        </span>

        {/* Meta */}
        <div className="flex items-center gap-2 shrink-0">
          {task.energyLevel && (
            <span className="text-[10px]">{task.energyLevel === 'deep' ? '🧠' : '⚡'}</span>
          )}
          {task.estimatedMinutes && (
            <span className="text-[10px] text-slate-400">{task.estimatedMinutes}′</span>
          )}
          {task.status === 'doing' && (
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">בביצוע</span>
          )}
          <ChevronRight className={`w-3.5 h-3.5 text-slate-300 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {/* Expanded row */}
      {expanded && (
        <div className="px-3 pb-2 pt-0.5 space-y-1.5">
          <GoalTensionBar task={task} quarterly={quarterly} monthly={monthly} />
          {task.notes && (
            <p className="text-xs text-slate-400 leading-relaxed">{task.notes}</p>
          )}
          <div className="flex gap-2 pt-1">
            {task.status !== 'doing' && task.status !== 'done' && (
              <button
                onClick={() => onMove(task.id, 'doing')}
                className="text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                ⚡ התחל
              </button>
            )}
            {task.status !== 'done' && (
              <button
                onClick={() => onMove(task.id, 'week')}
                className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                → לשבוע
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Quick Add ────────────────────────────────────────────────────────────────
const DAILY_PRIORITY_CHIPS = [
  { key: 'critical', label: '🔴', dot: 'bg-red-500',    bg: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'high',     label: '🟠', dot: 'bg-orange-400', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'medium',   label: '🟡', dot: 'bg-amber-400',  bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'low',      label: '⚪', dot: 'bg-slate-300',  bg: 'bg-slate-50 text-slate-500 border-slate-200' },
]

function DailyQuickAdd({ onAdd }) {
  const [phase,    setPhase]    = useState('closed')  // 'closed' | 'title' | 'priority'
  const [title,    setTitle]    = useState('')
  const [priority, setPriority] = useState('medium')

  function reset() { setPhase('closed'); setTitle(''); setPriority('medium') }

  function submit(p = priority) {
    const t = title.trim()
    if (!t) return
    onAdd({ title: t, status: 'today', priority: p })
    reset()
  }

  if (phase === 'closed') return (
    <button
      onClick={() => setPhase('title')}
      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-dashed border-slate-200"
    >
      <Plus className="w-4 h-4" /> הוסף משימה להיום
    </button>
  )

  if (phase === 'title') return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); if (title.trim()) setPhase('priority') }
            if (e.key === 'Escape') reset()
          }}
          placeholder="שם המשימה... (Enter להמשיך)"
          className="flex-1 text-sm px-3 py-2 border border-brand-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
          dir="rtl"
        />
        <button onClick={reset} className="px-3 py-2 text-slate-400 hover:text-slate-600 rounded-xl">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  // phase === 'priority'
  return (
    <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-brand-100">
      <p className="text-xs font-bold text-slate-600 truncate">"{title}"</p>
      <div className="flex gap-1.5">
        {DAILY_PRIORITY_CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={() => { setPriority(chip.key); submit(chip.key) }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
              priority === chip.key ? chip.bg : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => submit()} className="flex-1 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors">
          הוסף ✓
        </button>
        <button onClick={reset} className="px-3 py-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg transition-colors text-xs">
          ביטול
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DailyPage() {
  const { tasks, addTask, moveTask, monthly, quarterly, profile } = useStore()
  const period   = usePeriod()
  const navigate = useNavigate()

  const brain = useMemo(
    () => getFlowBrainState({ profile, quarterly, monthly, tasks }),
    [profile, quarterly, monthly, tasks]
  )

  // Sorted today tasks: doing first, then by execution score
  const todayTasks = useMemo(() => {
    const active = tasks.filter(t => t.status === 'today' || t.status === 'doing')
    const done   = tasks.filter(t => {
      if (t.status !== 'done') return false
      const sot = startOfToday()
      return t.completedAt && new Date(t.completedAt) >= sot
    })
    const sorted = [...active].sort((a, b) => {
      if (a.status === 'doing' && b.status !== 'doing') return -1
      if (b.status === 'doing' && a.status !== 'doing') return 1
      if (a.isBigThree && !b.isBigThree) return -1
      if (b.isBigThree && !a.isBigThree) return 1
      return computeExecutionScore(b) - computeExecutionScore(a)
    })
    return [...sorted, ...done]
  }, [tasks])

  // Active task (doing)
  const activeTask = tasks.find(t => t.status === 'doing')

  // Complete a task
  const handleDone = useCallback((id) => {
    moveTask(id, 'done')
  }, [moveTask])

  // Period label
  const periodLabel = period
    ? `${period.weekLabel} · ${period.month}`
    : ''

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <TopBar
        title={`${greeting()}`}
        subtitle={periodLabel}
        action={
          <button
            onClick={() => navigate('/weekly')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            לוח מלא
          </button>
        }
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Flow state intervention (Scattered / NearWin / Overloaded) */}
        <FlowStateBanner brain={brain} tasks={tasks} onMove={moveTask} />

        {/* ── Zone 1: Next directive ── */}
        <NextDirective
          tasks={tasks}
          onMove={moveTask}
          onDone={handleDone}
          quarterly={quarterly}
          monthly={monthly}
        />

        {/* ── Zone 2: Today's task list ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-black text-slate-800">📌 היום</span>
            <span className="text-xs text-slate-400">{todayTasks.filter(t => t.status !== 'done').length} פתוחות</span>
          </div>

          <div className="divide-y divide-slate-50">
            {todayTasks.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-300">
                אין משימות להיום — הוסף משימה למטה
              </div>
            )}
            {todayTasks.map(task => (
              <TodayRow
                key={task.id}
                task={task}
                onDone={handleDone}
                onMove={moveTask}
                isActive={task.id === activeTask?.id}
                quarterly={quarterly}
                monthly={monthly}
              />
            ))}
          </div>

          {/* Quick add */}
          <div className="px-3 py-3 border-t border-slate-100">
            <DailyQuickAdd onAdd={addTask} />
          </div>
        </div>

        {/* ── Zone 3: Execution pulse + capacity ── */}
        <ExecutionPulse tasks={tasks} />

        {/* ── Spacer ── */}
        <div className="h-6" />
      </div>
    </div>
  )
}
