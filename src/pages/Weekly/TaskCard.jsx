import { useState, useEffect, useRef } from 'react'
import {
  Check, Trash2, Pencil, X,
  Star, RotateCcw,
  AlertTriangle, Clock, Zap, Target, GripVertical, CalendarClock,
} from 'lucide-react'
import { normPriority } from '../../utils/tasks.js'
import { detectStuck, classifyStuck } from '../../engine/stuckDetector.js'

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

// ── Due date helpers ──────────────────────────────────────────────────────────
function dueDateStatus(dueDate) {
  if (!dueDate) return null
  const due  = new Date(dueDate)
  due.setHours(23, 59, 59, 999)
  const now  = new Date()
  const diff = Math.ceil((due - now) / 86_400_000)  // days remaining
  const absDiff = Math.abs(diff)
  const dayWord = (n) => n === 1 ? 'יום' : 'ימים'
  if (diff < 0)  return { label: `פג תוקף לפני ${absDiff} ${dayWord(absDiff)}`, color: 'text-red-600 bg-red-50',   dot: 'bg-red-500',    overdue: true }
  if (diff === 0) return { label: 'היום',                                         color: 'text-red-500 bg-red-50',   dot: 'bg-red-400',    overdue: false }
  if (diff === 1) return { label: 'מחר',                                          color: 'text-amber-600 bg-amber-50', dot: 'bg-amber-400', overdue: false }
  if (diff <= 3)  return { label: `עוד ${diff} ${dayWord(diff)}`,                 color: 'text-amber-500 bg-amber-50', dot: 'bg-amber-300', overdue: false }
  const d = new Date(dueDate)
  const fmt = `${d.getDate()}/${d.getMonth() + 1}`
  return { label: fmt, color: 'text-slate-400 bg-slate-50', dot: 'bg-slate-300', overdue: false }
}

// ─── Task Card ────────────────────────────────────────────────────────────────
export default function TaskCard({ task, onMove, onDelete, onEdit, onUpdate, onToggleBig3, canAddBig3, isFocused, isDimmed, onFocus, goalOptions, isDragActive, dragListeners, dragHandleRef }) {
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [editingTitle,   setEditingTitle]   = useState(false)   // T1-B

  // Auto-dismiss delete confirm after 4 seconds of no action
  useEffect(() => {
    if (!confirmDelete) return
    const t = setTimeout(() => setConfirmDelete(false), 4000)
    return () => clearTimeout(t)
  }, [confirmDelete])
  const [titleDraft,     setTitleDraft]     = useState('')       // T1-B
  const [stuckOpen,      setStuckOpen]      = useState(false)   // T3-B
  const [goalPopover,    setGoalPopover]    = useState(false)   // T3-C
  const [elapsed,        setElapsed]        = useState(0)       // T2-E (seconds)
  const [completing,     setCompleting]     = useState(false)   // completion animation
  const titleInputRef = useRef(null)

  const pKey  = normPriority(task.priority)
  const pMeta = PRIORITY_META[pKey]
  const tMeta = TYPE_META[task.type] || TYPE_META.strategy
  const isDone    = task.status === 'done'
  const isToday   = task.status === 'today'
  const isDoing   = task.status === 'doing'
  const isWeek    = task.status === 'week'
  const isBacklog = task.status === 'backlog'

  // Stuck detection: use engine for full classification
  const isStuck = detectStuck(task)
  const stuckSignal = isStuck ? classifyStuck(task) : null

  // T2-E: live elapsed timer for doing tasks
  useEffect(() => {
    if (!isDoing || !task.doingStartedAt) return
    function tick() {
      setElapsed(Math.floor((Date.now() - new Date(task.doingStartedAt).getTime()) / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isDoing, task.doingStartedAt])

  // T1-B: start inline edit
  function startInlineEdit(e) {
    e.stopPropagation()
    setTitleDraft(task.title)
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  function commitInlineEdit() {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed })
    }
    setEditingTitle(false)
  }

  function cancelInlineEdit() {
    setEditingTitle(false)
  }

  // T2-E: format elapsed seconds as Xm Ys
  function fmtElapsed(secs) {
    if (secs < 60) return `${secs}ש׳`
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m} דק׳`
  }

  // Priority strip color
  const priorityStripColor = isDoing
    ? 'bg-purple-400'
    : pKey === 'critical' ? 'bg-red-500'
    : pKey === 'high'     ? 'bg-orange-400'
    : pKey === 'medium'   ? 'bg-amber-300'
    : 'bg-slate-200'

  // Completion handler — animate then move
  function handleComplete(e) {
    e.stopPropagation()
    if (isDone) { onMove(task.id, 'backlog'); return }
    setCompleting(true)
    setTimeout(() => {
      setCompleting(false)
      onMove(task.id, 'done')
    }, 380)
  }

  // Card visual identity: Big3 > Doing > regular
  // Animations are disabled while any drag is active — prevents CSS conflict with dnd-kit transform
  const isBig3Active = task.isBigThree && !isDone
  const cardBg    = isBig3Active ? 'bg-gradient-to-br from-brand-50 via-white to-white'
                  : isDoing      ? 'bg-gradient-to-br from-purple-50/60 to-white'
                  : 'bg-white'
  const cardShadow= isBig3Active ? 'shadow-glow-brand'
                  : isDoing      ? 'shadow-glow-purple'
                  : 'shadow-card'
  // Never animate during drag — it fights the dnd-kit transform
  const cardAnim  = isDragActive ? ''
                  : isBig3Active ? 'animate-glow-pulse'
                  : isDoing      ? 'animate-doing-ring'
                  : ''

  return (
    <div
      onClick={e => {
        if (!isDone && !e.target.closest('button') && !e.target.closest('input') && onFocus) {
          e.stopPropagation()
          onFocus(task.id)
        }
      }}
      className={[
        // IMPORTANT: no transition-all — only transition specific non-transform props
        // transition-all would conflict with dnd-kit's CSS transform animation
        'rounded-xl border overflow-hidden transition-[box-shadow,opacity,border-color] duration-200',
        cardBg, cardShadow, cardAnim,
        completing ? 'animate-complete-flash scale-[1.01]' : '',
        isDone ? 'opacity-55' : '',
        isFocused ? '!shadow-glow-brand ring-2 ring-brand-400' : '',
        isDimmed ? 'opacity-20 pointer-events-none select-none' : '',
        !isDone && !isFocused && !isDimmed && !isBig3Active && !isDoing ? 'hover:shadow-card-hover hover:border-slate-300' : '',
        isBig3Active ? 'border-brand-200' : isDoing ? 'border-purple-200' : 'border-slate-200',
      ].filter(Boolean).join(' ')}
    >
      {/* Priority strip — top accent bar */}
      <div className={`h-1 w-full ${priorityStripColor}`} />

      {/* Card body */}
      <div className="px-3 pt-2.5 pb-3 space-y-2.5">

        {/* Focus mode exit strip — only visible when this card is focused */}
        {isFocused && (
          <div className="flex items-center justify-between bg-brand-50 border border-brand-100 rounded-lg px-2.5 py-1.5 -mt-0.5">
            <span className="text-[10px] font-bold text-brand-500">🎯 מצב מיקוד פעיל</span>
            <button
              onClick={e => { e.stopPropagation(); onFocus(task.id) }}
              className="flex items-center gap-1 text-[10px] font-black text-brand-500 hover:text-brand-800 bg-brand-100 hover:bg-brand-200 px-2 py-0.5 rounded-lg transition-colors"
            >
              <X className="w-3 h-3" /> יציאה
            </button>
          </div>
        )}

        {/* Title row */}
        <div className="flex items-start gap-2">
          {/* Drag handle — only this element initiates drag.
               dragHandleRef (setActivatorNodeRef) tells dnd-kit to measure drag
               offset from THIS element so the ghost appears under the cursor. */}
          {dragListeners && (
            <div
              ref={dragHandleRef}
              {...dragListeners}
              className="shrink-0 mt-1.5 cursor-grab active:cursor-grabbing touch-none p-0.5 -ml-0.5 text-slate-300 hover:text-slate-400 transition-colors"
              title="גרור"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}
          {/* Quick-complete circle */}
          <button
            onClick={handleComplete}
            className={[
              'w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200',
              isDone
                ? 'bg-green-500 border-green-500 scale-100'
                : completing
                  ? 'bg-green-400 border-green-400 scale-110'
                  : 'border-slate-300 hover:border-green-400 hover:bg-green-50 hover:scale-110',
            ].join(' ')}
            title={isDone ? 'החזר למשימות' : 'סמן כבוצע'}
          >
            {(isDone || completing) && <Check className="w-3.5 h-3.5 text-white" />}
          </button>

          {/* T1-B: inline edit or display */}
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitInlineEdit() }
                if (e.key === 'Escape') cancelInlineEdit()
              }}
              onBlur={commitInlineEdit}
              onClick={e => e.stopPropagation()}
              className="flex-1 text-sm font-semibold text-slate-800 bg-brand-50 border border-brand-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          ) : (
            <p
              onDoubleClick={isDone ? undefined : e => { e.stopPropagation(); startInlineEdit(e) }}
              className={`flex-1 text-sm font-semibold leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-800 cursor-text'}`}
              title={isDone ? '' : 'לחץ פעמיים לעריכה מהירה'}
            >
              {task.title}
            </p>
          )}

          {/* Big 3 star */}
          <button
            onClick={e => { e.stopPropagation(); onToggleBig3(task, canAddBig3) }}
            className={`shrink-0 transition-all duration-200 ${
              task.isBigThree
                ? 'text-brand-500 scale-110'
                : 'text-slate-300 hover:text-brand-400 hover:scale-110'
            }`}
            title={task.isBigThree ? 'הסר מ-Big 3' : 'הוסף ל-Big 3'}
          >
            <Star className={`w-4 h-4 ${task.isBigThree ? 'fill-brand-500 drop-shadow-sm' : ''}`} />
          </button>
          {!isDone && (
            <button onClick={e => { e.stopPropagation(); onEdit(task) }} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors" title="עריכה מלאה">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm leading-none">{tMeta.emoji}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pMeta.bg}`}>{pMeta.label}</span>
          {/* T2-B: energy level tag */}
          {task.energyLevel === 'deep'  && <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">🧠 עמוק</span>}
          {task.energyLevel === 'quick' && <span className="text-[10px] font-semibold bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded-full">⚡ מהיר</span>}
          {task.estimatedMinutes && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{task.estimatedMinutes} דק׳
            </span>
          )}
          {/* Due date badge */}
          {!isDone && task.dueDate && (() => {
            const ds = dueDateStatus(task.dueDate)
            return ds ? (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${ds.color}`}>
                <CalendarClock className="w-2.5 h-2.5 shrink-0" />{ds.label}
              </span>
            ) : null
          })()}
          {/* T2-E: live elapsed timer */}
          {isDoing && task.doingStartedAt && (
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
              ⏱ {fmtElapsed(elapsed)}
            </span>
          )}
        </div>

        {/* Goal connection strip */}
        {!isDone && (
          task.goalRef ? (
            <div className="flex items-center gap-2 bg-brand-50 rounded-lg px-2.5 py-1.5 border border-brand-100">
              <Target className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              <span className="flex-1 text-[11px] font-semibold text-brand-700 truncate">{task.goalRef}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                task.goalType === 'quarterly' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {task.goalType === 'quarterly' ? 'רבעוני' : task.goalType === 'monthly' ? 'חודשי' : ''}
              </span>
            </div>
          ) : !isStuck ? (
            <div className="relative">
              {goalPopover && goalOptions?.length > 1 ? (
                <div className="bg-white border border-brand-200 rounded-xl shadow-lg p-2 space-y-1 z-10" onClick={e => e.stopPropagation()}>
                  <p className="text-[10px] font-bold text-slate-500 mb-1">חבר ליעד:</p>
                  {goalOptions.filter(o => o.value).slice(0, 4).map((opt, i) => (
                    <button key={i}
                      onClick={e => { e.stopPropagation(); onUpdate(task.id, { goalRef: opt.value, goalType: opt.type }); setGoalPopover(false) }}
                      className="w-full text-right text-[11px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-2 py-1.5 transition-colors">
                      ← {opt.label}
                    </button>
                  ))}
                  <button onClick={e => { e.stopPropagation(); setGoalPopover(false) }} className="w-full text-center text-[10px] text-slate-400 hover:text-slate-600 pt-0.5">ביטול</button>
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); goalOptions?.length > 1 ? setGoalPopover(true) : onEdit(task) }}
                  className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg px-2.5 py-1.5 w-full border border-amber-100 transition-colors"
                >
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>לא מחוברת ליעד — לחץ לחיבור</span>
                </button>
              )}
            </div>
          ) : null
        )}

        {/* T3-B: Stuck indicator — interactive, powered by stuckDetector engine */}
        {isStuck && stuckSignal && (
          <div className="relative">
            {stuckOpen ? (
              <div className="bg-red-50 border border-red-100 rounded-lg p-2 space-y-1">
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-sm">{stuckSignal.icon}</span>
                  <p className="text-[10px] font-bold text-red-700">{stuckSignal.label} — {stuckSignal.suggestion}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); onMove(task.id, 'done'); setStuckOpen(false) }}
                  className="w-full text-right text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg px-2 py-1.5 transition-colors">
                  ✓ סגרתי — העבר לבוצע
                </button>
                <button onClick={e => { e.stopPropagation(); onMove(task.id, 'today'); setStuckOpen(false) }}
                  className="w-full text-right text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-2 py-1.5 transition-colors">
                  🔪 פרק למשימות קטנות יותר
                </button>
                <button onClick={e => { e.stopPropagation(); onMove(task.id, 'backlog'); setStuckOpen(false) }}
                  className="w-full text-right text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg px-2 py-1.5 transition-colors">
                  ✕ דחה לרשימה
                </button>
                <button onClick={e => { e.stopPropagation(); setStuckOpen(false) }} className="w-full text-center text-[10px] text-slate-400 hover:text-slate-600 pt-0.5">סגור</button>
              </div>
            ) : (
              <button onClick={e => { e.stopPropagation(); setStuckOpen(true) }}
                className="w-full flex items-center gap-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg px-2 py-1 transition-colors">
                <span>{stuckSignal.icon}</span>
                {stuckSignal.label}: {stuckSignal.description}
              </button>
            )}
          </div>
        )}

        {/* Task quality warning — only when stuck indicator is not shown */}
        {!isDone && !isStuck && !task.goalRef && (() => {
          const missing = [
            !task.estimatedMinutes && 'זמן',
            !task.type || (task.type === 'strategy' && !task.goalRef) ? 'סוג' : null,
          ].filter(Boolean)
          if (missing.length >= 2) return (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
              משימה לא חדה — חסר: {missing.join(', ')}
            </p>
          )
          return null
        })()}

        {/* Action buttons — redesigned with primary/secondary layout */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {/* PRIMARY button */}
          {isBacklog && (
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'today') }}
              className="py-2.5 px-4 rounded-xl text-sm font-bold flex-1 bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center justify-center gap-1.5">
              להיום →
            </button>
          )}
          {isWeek && (
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'doing') }}
              className="py-2.5 px-4 rounded-xl text-sm font-bold flex-1 bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center justify-center gap-1.5">
              <Zap className="w-4 h-4" /> התחל
            </button>
          )}
          {isToday && (
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'done') }}
              className="py-2.5 px-4 rounded-xl text-sm font-bold flex-1 bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" /> בוצע
            </button>
          )}
          {isDoing && (
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'done') }}
              className="py-2.5 px-4 rounded-xl text-sm font-bold flex-1 bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" /> סגור
            </button>
          )}
          {isDone && (
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'backlog') }}
              className="py-2.5 px-4 rounded-xl text-sm font-bold flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> פתח
            </button>
          )}

          {/* SECONDARY buttons */}
          {isBacklog && <>
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'week') }}
              className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
              השבוע
            </button>
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'done') }}
              className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
              ✓ בוצע
            </button>
          </>}
          {isWeek && <>
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'today') }}
              className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
              להיום
            </button>
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'done') }}
              className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
              ✓ בוצע
            </button>
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'backlog') }}
              className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
              ← חזרה
            </button>
          </>}
          {isToday && <>
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'doing') }}
              className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors">
              ⚡ בביצוע
            </button>
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'week') }}
              className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
              ← לשבוע
            </button>
          </>}
          {isDoing && (
            <button onClick={e => { e.stopPropagation(); onMove(task.id, 'today') }}
              className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors">
              ⏸ פאוז
            </button>
          )}

          {/* Delete */}
          <div className="ml-auto">
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-red-600 font-medium">מחק?</span>
                <button onClick={e => { e.stopPropagation(); onDelete(task.id) }} className="text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded transition-colors">כן</button>
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(false) }} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={e => { e.stopPropagation(); setConfirmDelete(true) }} className="text-slate-400 hover:text-red-500 p-2.5 rounded-lg hover:bg-red-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" title="מחק משימה">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
