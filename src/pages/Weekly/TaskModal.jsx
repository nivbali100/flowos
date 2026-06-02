import { useState, useMemo, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { normPriority } from '../../utils/tasks.js'

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

const COLUMNS = [
  { id: 'backlog', label: 'רעיונות', emoji: '💡' },
  { id: 'week',    label: 'השבוע',   emoji: '📅' },
  { id: 'today',   label: 'היום',    emoji: '🎯' },
  { id: 'doing',   label: 'בביצוע',  emoji: '⚡' },
  { id: 'done',    label: 'בוצע',    emoji: '✓'  },
]

// ─── Task Modal (full edit) ───────────────────────────────────────────────────
export default function TaskModal({ task, quarterly, monthly, period, big3Count, onSave, onClose, onDelete }) {
  const [form, setForm] = useState({
    title:            task.title || '',
    type:             task.type || 'strategy',
    priority:         normPriority(task.priority),
    energyLevel:      task.energyLevel || null,
    isBigThree:       task.isBigThree || false,
    goalRef:          task.goalRef || '',
    goalType:         task.goalType || 'none',
    estimatedMinutes: task.estimatedMinutes || '',
    dueDate:          task.dueDate || '',
    notes:            task.notes || '',
    status:           task.status || 'backlog',
  })
  const [big3Err, setBig3Err]         = useState(false)

  // Close on Escape
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])
  const [confirmDelete, setConfirmDel] = useState(false)

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Build goal options from quarterly/monthly key moves
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

  function handleBig3() {
    if (!form.isBigThree && big3Count >= 3) {
      setBig3Err(true); setTimeout(() => setBig3Err(false), 2500); return
    }
    F('isBigThree', !form.isBigThree)
  }

  function handleSave() {
    if (!form.title.trim()) return
    onSave(task.id, {
      ...form,
      title:            form.title.trim(),
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : null,
      dueDate:          form.dueDate || null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/50 px-3 pb-2 md:pb-0 md:px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85dvh] md:max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <h3 className="font-black text-slate-900">עריכת משימה</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto p-4 space-y-4">

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">כותרת *</label>
            <input
              autoFocus
              value={form.title}
              onChange={e => F('title', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="כותרת המשימה"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">עדיפות</label>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(PRIORITY_META).map(([k, m]) => (
                <button key={k} onClick={() => F('priority', k)}
                  className={`text-xs font-bold py-2 rounded-xl border transition-colors ${
                    form.priority === k ? `${m.bg} border-transparent` : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">סוג</label>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(TYPE_META).map(([k, m]) => (
                <button key={k} onClick={() => F('type', k)}
                  className={`flex flex-col items-center py-2 rounded-xl border transition-colors ${
                    form.type === k
                      ? 'bg-brand-50 border-brand-300 text-brand-800'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg leading-none">{m.emoji}</span>
                  <span className="text-[10px] mt-1">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* T2-B: Energy level toggle */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">אנרגיה נדרשת</label>
            <div className="flex gap-1.5">
              {[
                { key: 'deep',  label: 'עמוק',  emoji: '🧠', bg: 'bg-blue-100 text-blue-700 border-blue-200' },
                { key: 'quick', label: 'מהיר',  emoji: '⚡', bg: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
              ].map(e => (
                <button key={e.key} onClick={() => F('energyLevel', form.energyLevel === e.key ? null : e.key)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    form.energyLevel === e.key ? e.bg : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {e.emoji} {e.label}
                </button>
              ))}
              {form.energyLevel && (
                <button onClick={() => F('energyLevel', null)}
                  className="px-3 py-2 border border-slate-200 text-slate-400 text-xs rounded-xl hover:border-slate-300 transition-colors">
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Goal link */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">מחוברת ליעד</label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {goalOptions.map((opt, i) => (
                <button key={i}
                  onClick={() => { F('goalRef', opt.value); F('goalType', opt.type) }}
                  className={`w-full text-right text-xs font-medium py-2 px-3 rounded-xl border transition-colors ${
                    form.goalRef === opt.value && form.goalType === opt.type
                      ? 'bg-brand-50 border-brand-300 text-brand-800'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {opt.value ? `← ${opt.label}` : opt.label}
                </button>
              ))}
            </div>
            {!form.goalRef && (
              <p className="text-[11px] text-amber-600 mt-1.5">⚠ משימה בלי יעד — ודא שהיא באמת חשובה</p>
            )}
          </div>

          {/* Big 3 toggle */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
            form.isBigThree ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="text-sm font-bold text-slate-800">Big 3 — הגדולים של השבוע</div>
              <div className="text-xs text-slate-500">עד 3 משימות בלבד</div>
            </div>
            <button onClick={handleBig3}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                form.isBigThree ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                form.isBigThree ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>
          {big3Err && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              ⚠ כבר יש 3 הגדולים — הסר אחד כדי להוסיף
            </p>
          )}

          {/* Status */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">עמודה</label>
            <div className="flex gap-1.5 flex-wrap">
              {COLUMNS.map(col => (
                <button key={col.id} onClick={() => F('status', col.id)}
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-colors ${
                    form.status === col.id
                      ? 'bg-brand-600 text-white border-transparent'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {col.emoji} {col.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estimated time + Due date — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">⏱ זמן משוער (דק׳)</label>
              <input
                type="number" min={0} value={form.estimatedMinutes}
                onChange={e => F('estimatedMinutes', e.target.value)}
                className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="45"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">📅 תאריך יעד</label>
              <input
                type="date" value={form.dueDate}
                onChange={e => F('dueDate', e.target.value)}
                className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              {form.dueDate && (
                <button onClick={() => F('dueDate', '')} className="text-[10px] text-slate-400 hover:text-red-400 mt-1 transition-colors">
                  ✕ הסר תאריך
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">הערות</label>
            <textarea
              rows={3} value={form.notes}
              onChange={e => F('notes', e.target.value)}
              className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="הערות נוספות..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-slate-100 shrink-0">
          {confirmDelete ? (
            <>
              <span className="text-sm text-red-600 font-medium flex-1 flex items-center">האם למחוק לצמיתות?</span>
              <button onClick={() => { onDelete(task.id); onClose() }} className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-colors">מחק</button>
              <button onClick={() => setConfirmDel(false)} className="px-4 py-2.5 border border-slate-200 text-slate-500 text-sm rounded-xl transition-colors">ביטול</button>
            </>
          ) : (
            <>
              <button onClick={handleSave} disabled={!form.title.trim()}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-colors">
                שמור
              </button>
              <button onClick={() => setConfirmDel(true)}
                className="px-4 py-2.5 text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 rounded-xl transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
