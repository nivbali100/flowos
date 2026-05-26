import { useState } from 'react'
import { Plus, X } from 'lucide-react'

const PRIORITY_META = {
  critical: { label: 'קריטי', bg: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  high:     { label: 'גבוה',  bg: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  medium:   { label: 'בינוני', bg: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  low:      { label: 'נמוך',  bg: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-300' },
}

// ─── Quick Add Form ───────────────────────────────────────────────────────────
export default function QuickAddForm({ colId, onAdd }) {
  const [phase,       setPhase]       = useState('closed')   // 'closed' | 'title' | 'meta'
  const [title,       setTitle]       = useState('')
  const [priority,    setPriority]    = useState('medium')
  const [energyLevel, setEnergyLevel] = useState(null)       // null | 'deep' | 'quick'

  function handleTitleKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const t = title.trim()
      if (!t) return
      setPhase('meta')
    }
    if (e.key === 'Escape') reset()
  }

  function submit() {
    const t = title.trim()
    if (!t) return
    onAdd({ title: t, status: colId, priority, type: 'strategy', energyLevel })
    reset()
  }

  function reset() {
    setPhase('closed')
    setTitle('')
    setPriority('medium')
    setEnergyLevel(null)
  }

  if (phase === 'closed') return (
    <button
      onClick={() => setPhase('title')}
      className="w-full flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2.5 transition-colors"
    >
      <Plus className="w-4 h-4" /> הוסף משימה
    </button>
  )

  if (phase === 'title') return (
    <div className="bg-white rounded-xl border border-brand-200 shadow-sm p-3 space-y-2">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleTitleKey}
        placeholder="כותרת המשימה — לחץ Enter להמשיך..."
        className="w-full text-sm text-slate-800 bg-slate-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200 border border-slate-100"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { if (title.trim()) setPhase('meta') }}
          disabled={!title.trim()}
          className="flex-1 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold rounded-lg transition-colors"
        >
          הגדר עדיפות →
        </button>
        <button type="button" onClick={reset} className="px-3 py-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )

  // phase === 'meta'
  return (
    <div className="bg-white rounded-xl border border-brand-300 shadow-sm p-3 space-y-3"
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); reset() } }}>
      <p className="text-xs font-bold text-slate-700 truncate">"{title}"</p>

      {/* Priority chips */}
      <div>
        <div className="text-[10px] font-bold text-slate-400 mb-1.5">עדיפות</div>
        <div className="flex gap-1.5">
          {Object.entries(PRIORITY_META).map(([k, m]) => (
            <button key={k} onClick={() => setPriority(k)}
              className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-colors ${
                priority === k ? `${m.bg} border-transparent` : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${m.dot} inline-block ml-1`} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Energy chips */}
      <div>
        <div className="text-[10px] font-bold text-slate-400 mb-1.5">אנרגיה</div>
        <div className="flex gap-1.5">
          {[
            { key: 'deep',  label: 'עמוק',  emoji: '🧠', bg: 'bg-blue-100 text-blue-700' },
            { key: 'quick', label: 'מהיר',  emoji: '⚡', bg: 'bg-yellow-100 text-yellow-700' },
          ].map(e => (
            <button key={e.key} onClick={() => setEnergyLevel(prev => prev === e.key ? null : e.key)}
              className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-colors ${
                energyLevel === e.key ? `${e.bg} border-transparent` : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {e.emoji} {e.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={submit} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> הוסף
        </button>
        <button onClick={reset} className="px-3 py-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
