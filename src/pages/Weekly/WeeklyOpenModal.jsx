/**
 * WeeklyOpenModal — start-of-week intention setting.
 *
 * Step 1 — "אתה נכנס לשבוע בתור מי?"
 *   4 state tiles (charged/focused/tired/scattered). Tap advances automatically.
 *
 * Step 2 — "מה הדבר שאם יקרה — השבוע הצליח?"
 *   Single text input.
 *
 * Step 3 — Silent dark confirmation (matches MorningRitual Beat4 style)
 *   Shows week intent in quotes. 2s delay before button.
 *
 * NO XP rewards.
 */
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const WEEK_OPENED_KEY = 'flowos_week_opened'
const WEEK_INTENT_KEY = 'flowos_week_intent'

const STATES = [
  { id: 'charged',   label: 'טעון',   emoji: '🔥' },
  { id: 'focused',   label: 'ממוקד',  emoji: '🧠' },
  { id: 'tired',     label: 'עייף',   emoji: '😴' },
  { id: 'scattered', label: 'מפוזר',  emoji: '🌀' },
]

// ─── Step 1: State Selection ──────────────────────────────────────────────────
function Step1({ onSelect }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <p className="text-xl font-black text-slate-900 text-center mb-8 leading-snug">
        אתה נכנס לשבוע בתור מי?
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

// ─── Step 2: Week Intent ──────────────────────────────────────────────────────
function Step2({ onCommit }) {
  const [input, setInput] = useState('')

  function handleSubmit() {
    const text = input.trim()
    if (!text) return
    onCommit(text)
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <p className="text-xl font-black text-slate-900 mb-2 leading-snug">
        מה הדבר שאם יקרה — השבוע הצליח?
      </p>
      <p className="text-xs text-slate-400 mb-6">דבר אחד בלבד.</p>

      <input
        autoFocus
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
        placeholder="דבר אחד בלבד."
        className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-200 mb-4"
      />

      <button
        onClick={handleSubmit}
        disabled={!input.trim()}
        className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-black rounded-xl transition-colors"
      >
        זה שבועי →
      </button>
    </div>
  )
}

// ─── Step 3: Silent Confirmation ──────────────────────────────────────────────
function Step3({ weekIntentText, weekLabel, onFinish }) {
  const [canFinish, setCanFinish] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setCanFinish(true), 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 bg-slate-900 text-white" style={{ borderRadius: '0 0 1rem 1rem' }}>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">
        שבוע {weekLabel}
      </p>
      <p className="text-2xl font-black text-white text-center leading-snug mb-10 max-w-xs">
        "{weekIntentText}"
      </p>
      <button
        onClick={canFinish ? onFinish : undefined}
        className={`w-full max-w-xs py-3.5 rounded-xl text-sm font-black transition-all ${
          canFinish
            ? 'bg-white text-slate-900 hover:bg-slate-100'
            : 'bg-slate-800 text-slate-600 cursor-default'
        }`}
      >
        {canFinish ? '→ בוא נעשה את זה' : '...'}
      </button>
    </div>
  )
}

// ─── Main WeeklyOpenModal Component ──────────────────────────────────────────
export default function WeeklyOpenModal({ onClose, weekLabel, weekId }) {
  const today = new Date().toDateString()

  // State machine: step1 | step2 | step3
  const [step,           setStep]           = useState('step1')
  const [selectedState,  setSelectedState]  = useState(null)
  const [weekIntentText, setWeekIntentText] = useState('')

  // Escape to close (only on step1/step2)
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape' && step !== 'step3') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose, step])

  function handleStep1Select(state) {
    setSelectedState(state)
    setStep('step2')
  }

  function handleStep2Commit(text) {
    setWeekIntentText(text)
    setStep('step3')
  }

  function handleFinish() {
    try {
      localStorage.setItem(WEEK_OPENED_KEY, weekId)
      localStorage.setItem(WEEK_INTENT_KEY, JSON.stringify({
        text: weekIntentText,
        state: selectedState,
        weekId,
        date: today,
      }))
    } catch {}
    onClose()
  }

  const stepNum = step === 'step1' ? '1' : step === 'step2' ? '2' : '3'

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/60 px-3 pb-2 md:pb-0 md:px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '85dvh' }}>

        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0 ${step === 'step3' ? 'bg-slate-900' : 'bg-white'}`}>
          <div>
            <h3 className={`font-black text-sm ${step === 'step3' ? 'text-white' : 'text-slate-900'}`}>
              📅 פתיחת שבוע
            </h3>
            {step !== 'step3' && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                שלב {stepNum} מתוך 3
              </p>
            )}
          </div>
          {step !== 'step3' && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step content */}
        <div className={`flex flex-col overflow-y-auto ${step === 'step3' ? 'bg-slate-900 flex-1' : 'flex-1'}`}>
          {step === 'step1' && (
            <Step1 onSelect={handleStep1Select} />
          )}

          {step === 'step2' && (
            <Step2 onCommit={handleStep2Commit} />
          )}

          {step === 'step3' && (
            <Step3 weekIntentText={weekIntentText} weekLabel={weekLabel} onFinish={handleFinish} />
          )}
        </div>
      </div>
    </div>
  )
}
