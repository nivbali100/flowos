import { useState, useMemo, useEffect } from 'react'
import { X } from 'lucide-react'
import { normPriority } from '../../utils/tasks.js'
import { syncWeekSummary } from '../../lib/supabase.js'
import {
  STUCK_HOURS,
  MAX_WEEKLY_SUMMARIES,
} from '../../constants/app.js'

const PRIORITY_META = {
  critical: { label: 'קריטי', bg: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  high:     { label: 'גבוה',  bg: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  medium:   { label: 'בינוני', bg: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  low:      { label: 'נמוך',  bg: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-300' },
}

// ─── Close Week Modal ─────────────────────────────────────────────────────────
export default function CloseWeekModal({ tasks, period, onClose, onMoveTask, onDeleteTask, profile }) {
  const [mainWin,    setMainWin]    = useState('')
  const [whatWorked, setWhatWorked] = useState('')   // retro: מה עבד
  const [whatChange, setWhatChange] = useState('')   // retro: מה לשנות
  const [saved,      setSaved]      = useState(false)
  const [saving,     setSaving]     = useState(false) // guard against double-submit
  const [step,       setStep]       = useState(1)    // T3-D: 1=stats, 2=manage open tasks
  const [decisions,  setDecisions]  = useState({})   // T3-D: { taskId: 'next-week'|'backlog'|'delete' }

  // Close on Escape (only step 1 — step 2 has decisions to make)
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape' && step === 1) onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, step])

  const stats = useMemo(() => {
    const total     = tasks.length
    const done      = tasks.filter(t => t.status === 'done')
    const big3All   = tasks.filter(t => t.isBigThree)
    const big3Done  = big3All.filter(t => t.status === 'done')
    const stuck     = tasks.filter(t => {
      if (t.status !== 'doing' || !t.updatedAt) return false
      return (Date.now() - new Date(t.updatedAt).getTime()) / 3_600_000 > STUCK_HOURS
    })
    const noGoal    = tasks.filter(t => t.status !== 'done' && !t.goalRef)
    const pct       = total > 0 ? Math.round((done.length / total) * 100) : 0
    return { total, done: done.length, big3Done: big3Done.length, big3Total: big3All.length, stuck: stuck.length, noGoal: noGoal.length, pct }
  }, [tasks])

  function handleSave() {
    if (saving || saved) return     // guard: ignore double-tap / double-click
    setSaving(true)

    const summary = {
      savedAt:        new Date().toISOString(),
      weekLabel:      period.weekLabel,
      month:          period.month,
      totalTasks:     stats.total,
      completedCount: stats.done,
      completionPct:  stats.pct,
      big3Total:      stats.big3Total,
      big3Done:       stats.big3Done,
      stuckCount:     stats.stuck,
      noGoalCount:    stats.noGoal,
      mainWin:        mainWin.trim(),
      whatWorked:     whatWorked.trim(),
      whatChange:     whatChange.trim(),
    }
    try {
      const existing = JSON.parse(localStorage.getItem('flowos_weekly_summaries') || '[]')
      localStorage.setItem(
        'flowos_weekly_summaries',
        JSON.stringify([summary, ...existing].slice(0, MAX_WEEKLY_SUMMARIES))
      )
    } catch {}
    // Sync to Supabase — fire-and-forget, never blocks UI
    syncWeekSummary(summary, profile)
    setSaved(true)
    setSaving(false)
    // T3-D: if there are open tasks, show step 2
    const openTasks = tasks.filter(t => t.status !== 'done')
    if (openTasks.length > 0) {
      setTimeout(() => setStep(2), 800)
    } else {
      setTimeout(onClose, 1400)
    }
  }

  // T3-D: apply decisions and close
  function applyDecisions() {
    Object.entries(decisions).forEach(([id, action]) => {
      if (action === 'next-week') onMoveTask(id, 'week')
      else if (action === 'backlog') onMoveTask(id, 'backlog')
      else if (action === 'delete') onDeleteTask(id)
    })
    onClose()
  }

  const openTasks = tasks.filter(t => t.status !== 'done')

  const STAT_ROWS = [
    { label: '✅ משימות הושלמו',     value: `${stats.done}/${stats.total}`, sub: `${stats.pct}%`,    color: stats.pct >= 70 ? 'text-green-600' : 'text-amber-600' },
    { label: '★ Big 3',              value: `${stats.big3Done}/${stats.big3Total || 3}`, sub: stats.big3Done >= 2 ? 'מצוין' : 'לא הושלם', color: stats.big3Done >= 2 ? 'text-brand-600' : 'text-red-500' },
    { label: '📌 תקועות בביצוע',     value: stats.stuck,  sub: stats.stuck > 0 ? 'לטפל השבוע הבא' : 'נקי', color: stats.stuck > 0 ? 'text-red-500' : 'text-green-600' },
    { label: '⚠ ללא יעד (פתוחות)',  value: stats.noGoal, sub: stats.noGoal > 0 ? 'רעש — שקול לבטל' : 'הכל מחובר', color: stats.noGoal > 0 ? 'text-amber-600' : 'text-green-600' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 px-3 pb-2 md:pb-0 md:px-4" onClick={step === 1 ? onClose : undefined}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85dvh] md:max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-lg">סגירת שבוע</h3>
            <p className="text-xs text-slate-400 mt-0.5">{period.weekLabel} · {period.month}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {STAT_ROWS.map(row => (
              <div key={row.label} className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-semibold text-slate-500 mb-1">{row.label}</div>
                <div className={`text-2xl font-black ${row.color}`}>{row.value}</div>
                <div className={`text-[10px] font-medium mt-0.5 ${row.color}`}>{row.sub}</div>
              </div>
            ))}
          </div>

          {/* Main win */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">
              🏆 מה הדבר המרכזי שהתקדמת בו השבוע?
            </label>
            <textarea
              rows={2}
              value={mainWin}
              onChange={e => setMainWin(e.target.value)}
              placeholder="לדוגמה: סגרתי 2 עסקאות, סיימתי את מצגת הקורס..."
              className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          {/* Retrospective */}
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 space-y-3">
            <p className="text-[10px] font-black text-brand-700 uppercase tracking-widest">רטרוספקטיבה שבועית</p>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">✅ מה עבד טוב השבוע?</label>
              <textarea
                rows={2}
                value={whatWorked}
                onChange={e => setWhatWorked(e.target.value)}
                placeholder="מה עשיתי נכון? מה גרם לתוצאות?"
                className="w-full text-sm text-slate-800 border border-brand-200 bg-white rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">🔄 מה אשנה בשבוע הבא?</label>
              <textarea
                rows={2}
                value={whatChange}
                onChange={e => setWhatChange(e.target.value)}
                placeholder="שינוי אחד קטן שיעשה הבדל גדול..."
                className="w-full text-sm text-slate-800 border border-brand-200 bg-white rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          {/* Carry-over hint */}
          {stats.noGoal > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-xs text-amber-800">
              💡 יש {stats.noGoal} משימות פתוחות ללא יעד — שקול לבטל אותן לפני שמתחיל שבוע חדש.
            </div>
          )}
        </div>

        {/* T3-D: Step 2 — manage open tasks */}
        {step === 2 && (
          <div className="p-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-800">ניהול {openTasks.length} פתוחות</p>
              <span className="text-xs text-slate-400">מה עושים עם כל אחת?</span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {openTasks.map(t => {
                const pKey = normPriority(t.priority)
                const rec  = pKey === 'critical' ? 'לשבוע הבא חייב' : pKey === 'high' ? 'מומלץ לשבוע הבא' : ''
                const dec  = decisions[t.id]
                return (
                  <div key={t.id} className="bg-slate-50 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${PRIORITY_META[pKey]?.dot || 'bg-slate-300'}`} />
                      <p className="flex-1 text-xs font-semibold text-slate-700 leading-snug">{t.title}</p>
                      {rec && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">{rec}</span>}
                    </div>
                    <div className="flex gap-1.5">
                      {[
                        { key: 'next-week', label: 'לשבוע הבא', cls: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                        { key: 'backlog',   label: 'לרשימה',    cls: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
                        { key: 'delete',    label: 'בטל',        cls: 'bg-red-50 text-red-600 hover:bg-red-100' },
                      ].map(opt => (
                        <button key={opt.key}
                          onClick={() => setDecisions(prev => ({ ...prev, [t.id]: opt.key }))}
                          className={`flex-1 text-[10px] font-bold py-1 rounded-lg border transition-colors ${
                            dec === opt.key ? opt.cls + ' border-transparent ring-1 ring-brand-400' : opt.cls + ' border-transparent'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={applyDecisions}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl transition-colors">
              ✓ החל ונסגר
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          {step === 2 ? null : saved ? (
            <div className="text-center py-2 text-green-600 font-black text-sm flex items-center justify-center gap-2">
              <span>✓ השבוע נסגר ונשמר!</span>
              <span className="text-[11px] text-green-500 font-medium bg-green-50 px-2 py-0.5 rounded-full">☁ גובה לענן</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
              >
                שמור וסגור שבוע
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-200 text-slate-500 text-sm rounded-xl hover:bg-slate-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
