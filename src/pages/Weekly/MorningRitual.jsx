/**
 * MorningRitual — progressive 2–4 beat morning ceremony.
 *
 * Week 1 (days 1–7 of using the ritual): 4 beats (intro mode)
 * Week 2+ (days 8+): 2-beat Quick Ritual (Beat 2 + Beat 4 only)
 *
 * Beat 1 — REMOVED from quick ritual (state check → reflex-tap)
 * Beat 2 — The One Thing (Big3 shortcut chips)
 *           Also shows: Nightly Seed card from yesterday (if present)
 *           Also shows: Streak identity greeting (stage 2+)
 * Beat 3 — Obstacle (optional expansion, never forced)
 * Beat 4 — Silent commitment screen
 *
 * NO XP reward. NO cheerleading copy. Silence is the confirmation.
 */
import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'

const MORNING_DATE_KEY  = 'flowos_morning_date'
const MORNING_BLOCK_KEY = 'flowos_morning_block'
const INTENT_KEY        = 'flowos_daily_intent'
const RITUAL_COUNT_KEY  = 'flowos_morning_ritual_count'
const NIGHTLY_SEED_KEY  = 'flowos_nightly_seed'

function getRitualCount() {
  try { return Number(localStorage.getItem(RITUAL_COUNT_KEY) || 0) } catch { return 0 }
}

function incrementRitualCount() {
  try { localStorage.setItem(RITUAL_COUNT_KEY, String(getRitualCount() + 1)) } catch {}
}

// ─── Beat 1: Removed from quick ritual ───────────────────────────────────────
const STATES = [
  { id: 'charged',   label: 'טעון',   emoji: '🔥' },
  { id: 'focused',   label: 'ממוקד',  emoji: '🧠' },
  { id: 'tired',     label: 'עייף',   emoji: '😴' },
  { id: 'scattered', label: 'מפוזר',  emoji: '🌀' },
]

function Beat1({ onSelect }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <p className="text-xl font-black text-slate-900 text-center mb-8 leading-snug">
        אתה נכנס ליום בתור מי?
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {STATES.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-2xl transition-all active:scale-95"
          >
            <span className="text-3xl">{s.emoji}</span>
            <span className="text-sm font-black text-slate-800">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Beat 2: The One Thing ────────────────────────────────────────────────────
function Beat2({ big3Remaining, onCommit, yesterdaySeed, streakStage }) {
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState(null)
  const [seedAcknowledged, setSeedAcknowledged] = useState(false)

  function handleSeedYes() {
    setInput(yesterdaySeed.text)
    setSelected(null)
    setSeedAcknowledged(true)
  }

  function handleSeedOther() {
    setSeedAcknowledged(true)
  }

  function handleSubmit() {
    const text = selected ? selected.title : input.trim()
    if (!text) return
    onCommit({ text, taskId: selected?.id || null })
  }

  function handleSelectBig3(task) {
    setSelected(task)
    setInput('')
  }

  const value = selected ? selected.title : input

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <p className="text-xl font-black text-slate-900 mb-1 leading-snug">
        מה הדבר שאם יקרה — היום הצליח?
      </p>

      {/* Streak identity greeting — stage 2+ only */}
      {streakStage?.morningGreeting && (
        <p className="text-xs text-slate-400 mb-5">{streakStage.morningGreeting}</p>
      )}
      {!streakStage?.morningGreeting && (
        <p className="text-xs text-slate-400 mb-6">דבר אחד בלבד.</p>
      )}

      {/* Nightly Seed card — shows if yesterday's seed exists and not yet acknowledged */}
      {yesterdaySeed && !seedAcknowledged && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">
            אתמול לפני השינה כתבת:
          </p>
          <p className="text-sm font-bold text-amber-900 leading-snug mb-3">
            "{yesterdaySeed.text}"
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSeedYes}
              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-colors"
            >
              ✓ כן, זו הכוונה שלי
            </button>
            <button
              onClick={handleSeedOther}
              className="flex-1 py-2 bg-white border border-amber-200 hover:bg-amber-50 text-amber-700 text-xs font-bold rounded-xl transition-colors"
            >
              בחרת משהו אחר
            </button>
          </div>
        </div>
      )}

      {big3Remaining.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Big 3 שלך</p>
          <div className="space-y-2">
            {big3Remaining.slice(0, 2).map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectBig3(t)}
                className={`w-full text-right px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  selected?.id === t.id
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-brand-50 text-brand-800 border-brand-200 hover:bg-brand-100'
                }`}
              >
                ⭐ {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <input
          autoFocus={big3Remaining.length === 0 && (!yesterdaySeed || seedAcknowledged)}
          value={selected ? '' : input}
          onChange={e => { setInput(e.target.value); setSelected(null) }}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          placeholder={selected ? `נבחר: ${selected.title.slice(0, 30)}` : 'כתוב כאן...'}
          className={`w-full text-sm text-slate-800 border rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-brand-200 ${
            selected ? 'border-brand-300 bg-brand-50/50 text-brand-600 placeholder-brand-400' : 'border-slate-200'
          }`}
        />
        {selected && (
          <button onClick={() => setSelected(null)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="mt-4 w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-black rounded-xl transition-colors"
      >
        זה הדבר →
      </button>
    </div>
  )
}

// ─── Beat 3: Optional Obstacle ────────────────────────────────────────────────
const OBSTACLES = [
  { id: 'distraction', label: 'הסחות', emoji: '📱' },
  { id: 'overload',    label: 'עומס',  emoji: '🤯' },
  { id: 'unclear',     label: 'חוסר בהירות', emoji: '😟' },
  { id: 'technical',   label: 'תקלות', emoji: '🔧' },
]

function Beat3({ onCommit, onSkip }) {
  const [selected, setSelected] = useState(null)
  const [custom, setCustom] = useState('')

  function handleSubmit() {
    const block = selected ? OBSTACLES.find(o => o.id === selected)?.label : custom.trim()
    onCommit(block || null)
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <p className="text-xl font-black text-slate-900 mb-2 leading-snug">מה עלול לעצור אותך היום?</p>
      <p className="text-xs text-slate-400 mb-6">לזהות — זה כבר חצי הדרך.</p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {OBSTACLES.map(o => (
          <button
            key={o.id}
            onClick={() => setSelected(prev => prev === o.id ? null : o.id)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              selected === o.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>{o.emoji}</span><span>{o.label}</span>
          </button>
        ))}
      </div>

      <input
        value={custom}
        onChange={e => { setCustom(e.target.value); setSelected(null) }}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
        placeholder="משהו אחר..."
        className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-200 mb-4"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!selected && !custom.trim()}
          className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-black rounded-xl transition-colors"
        >
          הבנתי →
        </button>
        <button onClick={onSkip} className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 text-sm font-bold rounded-xl transition-colors">
          דלג
        </button>
      </div>
    </div>
  )
}

// ─── Beat 4: Silent Commitment ────────────────────────────────────────────────
function Beat4({ commitment, onFinish }) {
  const [canFinish, setCanFinish] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setCanFinish(true), 2500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 bg-slate-900 text-white" style={{ borderRadius: '0 0 1rem 1rem' }}>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">היום אתה בונה</p>
      <p className="text-2xl font-black text-white text-center leading-snug mb-8 max-w-xs">
        "{commitment}"
      </p>
      <button
        onClick={canFinish ? onFinish : undefined}
        className={`w-full max-w-xs py-3.5 rounded-xl text-sm font-black transition-all ${
          canFinish
            ? 'bg-white text-slate-900 hover:bg-slate-100'
            : 'bg-slate-800 text-slate-600 cursor-default'
        }`}
      >
        {canFinish ? '→ קדימה' : '...'}
      </button>
    </div>
  )
}

// ─── Main MorningRitual Component ─────────────────────────────────────────────
export default function MorningRitual({ onClose, onAdd, onMove, tasks, streakStage }) {
  const ritualCount = useMemo(() => getRitualCount(), [])
  const isQuickMode = ritualCount >= 7  // day 8+ = quick mode (Beat2 + optional Beat3 + Beat4)

  const big3Remaining = useMemo(
    () => tasks.filter(t => t.isBigThree && t.status !== 'done'),
    [tasks]
  )

  // Read yesterday's nightly seed — YYYY-MM-DD comparison
  const yesterdaySeed = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(NIGHTLY_SEED_KEY) || 'null')
      if (!raw?.text || !raw?.date) return null
      const y = new Date(Date.now() - 86400000)
      const yesterday = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`
      return raw.date === yesterday ? raw : null
    } catch { return null }
  }, [])

  // State machine: beat1 | beat2 | beat3 | beat4 | done
  const [beat, setBeat] = useState(isQuickMode ? 'beat2' : 'beat1')
  const [commitment, setCommitment] = useState('')
  const [committedTaskId, setCommittedTaskId] = useState(null)

  // Escape to close
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  function handleBeat1(state) {
    try { localStorage.setItem('flowos_morning_state_internal', JSON.stringify({ state, date: new Date().toDateString() })) } catch {}
    setBeat('beat2')
  }

  function handleBeat2({ text, taskId }) {
    setCommitment(text)
    setCommittedTaskId(taskId)
    if (!isQuickMode) {
      setBeat('beat3_prompt')
    } else {
      setBeat('beat4')
    }
  }

  function handleBeat3Commit(block) {
    if (block) {
      try { localStorage.setItem(MORNING_BLOCK_KEY, JSON.stringify({ block, date: new Date().toDateString() })) } catch {}
    }
    setBeat('beat4')
  }

  function handleFinish() {
    const today = new Date().toDateString()

    try { localStorage.setItem(INTENT_KEY, JSON.stringify({ text: commitment, date: today })) } catch {}
    try { localStorage.setItem(MORNING_DATE_KEY, today) } catch {}
    incrementRitualCount()

    if (committedTaskId) {
      const task = tasks.find(t => t.id === committedTaskId)
      if (task && task.status !== 'today' && task.status !== 'doing' && task.status !== 'done') {
        if (onMove) onMove(committedTaskId, 'today')
      }
    } else if (commitment.trim()) {
      onAdd({ title: commitment.trim(), status: 'today', priority: 'high', type: 'strategy' })
    }

    onClose()
  }

  const totalBeats = isQuickMode ? 2 : 4
  const currentBeatNum = beat === 'beat1' ? 1 : beat === 'beat2' ? (isQuickMode ? 1 : 2) : beat === 'beat3' || beat === 'beat3_prompt' ? 3 : isQuickMode ? 2 : 4

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/60 px-3 pb-2 md:pb-0 md:px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '85dvh' }}>

        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0 ${beat === 'beat4' ? 'bg-slate-900' : 'bg-white'}`}>
          <div>
            <h3 className={`font-black text-sm ${beat === 'beat4' ? 'text-white' : 'text-slate-900'}`}>
              {isQuickMode ? '☀️ בוקר — הדבר האחד' : '☀️ תכנון בוקר'}
            </h3>
            {beat !== 'beat4' && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isQuickMode ? 'גרסה מהירה' : `שלב ${currentBeatNum} מתוך ${totalBeats}`}
              </p>
            )}
          </div>
          {beat !== 'beat4' && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Beat content */}
        <div className={`flex flex-col overflow-y-auto ${beat === 'beat4' ? 'bg-slate-900 flex-1' : 'flex-1'}`}>
          {beat === 'beat1' && <Beat1 onSelect={handleBeat1} />}

          {beat === 'beat2' && (
            <Beat2
              big3Remaining={big3Remaining}
              onCommit={handleBeat2}
              yesterdaySeed={yesterdaySeed}
              streakStage={streakStage}
            />
          )}

          {beat === 'beat3_prompt' && (
            <div className="flex-1 flex flex-col px-6 py-8">
              <p className="text-xl font-black text-slate-900 mb-2">"{commitment}"</p>
              <p className="text-sm text-slate-500 mb-8">בחרת. 30 שניות נוספות יכולות לחזק את הכוונה.</p>
              <button
                onClick={() => setBeat('beat3')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors mb-3"
              >
                מה עלול לעצור אותי? (30 שניות)
              </button>
              <button
                onClick={() => setBeat('beat4')}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-xl transition-colors"
              >
                דלג → לסיום
              </button>
            </div>
          )}

          {beat === 'beat3' && (
            <Beat3 onCommit={handleBeat3Commit} onSkip={() => setBeat('beat4')} />
          )}

          {beat === 'beat4' && (
            <Beat4 commitment={commitment} onFinish={handleFinish} />
          )}
        </div>
      </div>
    </div>
  )
}
