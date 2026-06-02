/**
 * EveningRitual — 4-beat evening reflection.
 *
 * Beat E1 — "אתה סוגר את היום"
 *   Shows morning intent. 3 response buttons advance automatically.
 *
 * Beat E2 — "מה אתה לוקח מהיום?"
 *   Single text input with skip.
 *
 * Beat E3 — Silent close screen (dark, like Morning Beat4)
 *   Shows done count. 2.5s delay before button appears.
 *   Also shows streak identity whisper (stage 2+).
 *
 * Beat E4 — Nightly Seed
 *   Auto-generated seed for tomorrow. Edit option. Saves to localStorage.
 *   Ritual is already marked complete at E3→E4 transition.
 *
 * Core principle: "I closed the day I intentionally started."
 * NO XP rewards. NO cheerleading.
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import { X } from 'lucide-react'

const EVENING_DATE_KEY  = 'flowos_evening_date'
const EVENING_COUNT_KEY = 'flowos_evening_ritual_count'
const DAILY_REVIEW_KEY  = 'flowos_daily_review'
const INTENT_KEY        = 'flowos_daily_intent'
const NIGHTLY_SEED_KEY  = 'flowos_nightly_seed'

function getEveningCount() {
  try { return Number(localStorage.getItem(EVENING_COUNT_KEY) || 0) } catch { return 0 }
}

function incrementEveningCount() {
  try { localStorage.setItem(EVENING_COUNT_KEY, String(getEveningCount() + 1)) } catch {}
}

// ─── Seed Generation ──────────────────────────────────────────────────────────
// Priority: weekly intent unmet > Big Three completed > other completions > insight > morning intent > fallback
function generateSeed(intentText, intentMet, insightText, tasks) {
  const sot = new Date(); sot.setHours(0, 0, 0, 0)
  const completedToday = (tasks || []).filter(
    t => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= sot
  )
  const big3Today = completedToday.filter(t => t.isBigThree)

  let weekIntentText = null
  try {
    const raw = JSON.parse(localStorage.getItem('flowos_week_intent') || 'null')
    if (raw?.text && raw?.weekId) {
      const now = new Date()
      const mon = new Date(now)
      mon.setDate(now.getDate() + (now.getDay() === 0 ? -6 : 1 - now.getDay()))
      if (raw.weekId === 'week-' + mon.toISOString().slice(0, 10)) weekIntentText = raw.text
    }
  } catch {}

  if (weekIntentText && intentMet !== 'yes') {
    return `השבוע הגדרת: "${weekIntentText.slice(0, 50)}" — מחר, צעד אחד לכיוון הזה`
  }
  if (big3Today.length > 0) {
    return `סגרת היום את "${big3Today[0].title.slice(0, 40)}" — מחר, מה שזה פותח הוא...`
  }
  if (completedToday.length > 0) {
    return `המומנטום מהיום: "${completedToday[0].title.slice(0, 40)}" — מחר, ממשיכים`
  }
  if (insightText) {
    return `אמרת: "${insightText.slice(0, 55)}" — מחר זה יכול להיות נקודת ההתחלה`
  }
  if (intentText) {
    return `הכוונה של היום: "${intentText.slice(0, 50)}" — מחר, ממשיכים משם`
  }
  return 'מחר — יום חדש. מה הדבר האחד שיגרום לו להרגיש שווה?'
}

// ─── Beat E1: Intent Closing ──────────────────────────────────────────────────
function BeatE1({ intentText, onSelect }) {
  const hasIntent = !!intentText

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <p className="text-xl font-black text-slate-900 mb-6 leading-snug text-center">
        אתה סוגר את היום
      </p>

      {hasIntent ? (
        <div className="mb-6 bg-slate-50 rounded-2xl px-5 py-4 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">הכוונה שהגדרת הבוקר</p>
          <p className="text-base font-bold text-slate-800 leading-snug">"{intentText}"</p>
        </div>
      ) : (
        <div className="mb-6 bg-slate-50 rounded-2xl px-5 py-4 text-center">
          <p className="text-sm text-slate-400 font-medium">לא הגדרת כוונה הבוקר</p>
        </div>
      )}

      {hasIntent && (
        <p className="text-xs text-slate-500 text-center mb-6">קרה?</p>
      )}

      <div className="space-y-2.5">
        <button
          onClick={() => onSelect('yes')}
          className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 text-sm font-bold rounded-xl transition-all active:scale-95"
        >
          ✅ כן, קרה
        </button>
        <button
          onClick={() => onSelect('partial')}
          className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 text-sm font-bold rounded-xl transition-all active:scale-95"
        >
          ⚡ חלקית
        </button>
        <button
          onClick={() => onSelect('no')}
          className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 text-sm font-bold rounded-xl transition-all active:scale-95"
        >
          ❌ לא קרה
        </button>
      </div>
    </div>
  )
}

// ─── Beat E2: Insight ─────────────────────────────────────────────────────────
function BeatE2({ onCommit, onSkip }) {
  const [insight, setInsight] = useState('')

  function handleSubmit() {
    onCommit(insight.trim())
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <p className="text-xl font-black text-slate-900 mb-2 leading-snug">
        מה אתה לוקח מהיום?
      </p>

      <textarea
        autoFocus
        rows={4}
        value={insight}
        onChange={e => setInsight(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit() }}
        placeholder="תובנה אחת — משהו שהבנת, שעבד, שלא עבד..."
        className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-slate-200 mb-4"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!insight.trim()}
          className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-black rounded-xl transition-colors"
        >
          זה הלקח →
        </button>
        <button
          onClick={() => onSkip()}
          className="px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 text-sm font-bold rounded-xl transition-colors"
        >
          דלג
        </button>
      </div>
    </div>
  )
}

// ─── Beat E3: Silent Close ────────────────────────────────────────────────────
function BeatE3({ doneCount, streakStage, onFinish }) {
  const [canFinish, setCanFinish] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setCanFinish(true), 2500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 bg-slate-900 text-white" style={{ borderRadius: '0 0 1rem 1rem' }}>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">יום סגור</p>
      <p className="text-4xl font-black text-white mb-2">{doneCount}</p>
      <p className="text-sm text-slate-400 mb-4">משימות הושלמו היום</p>
      {streakStage?.eveningClose && (
        <p className="text-xs text-slate-500 text-center mb-6 max-w-xs leading-relaxed">
          {streakStage.eveningClose}
        </p>
      )}
      <button
        onClick={canFinish ? onFinish : undefined}
        className={`w-full max-w-xs py-3.5 rounded-xl text-sm font-black transition-all ${
          canFinish
            ? 'bg-white text-slate-900 hover:bg-slate-100'
            : 'bg-slate-800 text-slate-600 cursor-default'
        }`}
      >
        {canFinish ? '→ ביי' : '...'}
      </button>
    </div>
  )
}

// ─── Beat E4: Nightly Seed ────────────────────────────────────────────────────
function BeatE4({ autoSeed, isEmpty, onSave }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')

  if (isEmpty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 bg-slate-900 text-white" style={{ borderRadius: '0 0 1rem 1rem' }}>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">זרע הלילה</p>
        <p className="text-sm text-slate-400 text-center mb-2">יום שקט. לפעמים זה מה שצריך.</p>
        <p className="text-base font-black text-white text-center mb-6 max-w-xs leading-snug">
          מה אתה רוצה שמחר יהיה שונה?
        </p>
        <textarea
          autoFocus
          rows={3}
          maxLength={80}
          value={editText}
          onChange={e => setEditText(e.target.value)}
          placeholder="כתוב כאן..."
          className="w-full max-w-xs text-sm text-slate-900 bg-white rounded-xl px-3 py-3 resize-none focus:outline-none mb-6"
        />
        <button
          onClick={() => onSave(editText.trim(), 'manual')}
          className="w-full max-w-xs py-3.5 bg-white text-slate-900 text-sm font-black rounded-xl hover:bg-slate-100 transition-colors"
        >
          שמור וסיים — לילה טוב
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 bg-slate-900 text-white" style={{ borderRadius: '0 0 1rem 1rem' }}>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">זרע הלילה</p>
      {!editing ? (
        <>
          <p className="text-base font-bold text-white text-center leading-relaxed mb-4 max-w-xs">
            {autoSeed}
          </p>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-slate-500 hover:text-slate-400 mb-8 transition-colors"
          >
            כתוב זרע אחר
          </button>
        </>
      ) : (
        <textarea
          autoFocus
          rows={3}
          maxLength={80}
          value={editText}
          onChange={e => setEditText(e.target.value)}
          placeholder="כתוב את הזרע שלך..."
          className="w-full max-w-xs text-sm text-slate-900 bg-white rounded-xl px-3 py-3 resize-none focus:outline-none mb-8"
        />
      )}
      <button
        onClick={() => onSave(editing ? (editText.trim() || autoSeed) : autoSeed, editing ? 'manual' : 'auto')}
        className="w-full max-w-xs py-3.5 bg-white text-slate-900 text-sm font-black rounded-xl hover:bg-slate-100 transition-colors"
      >
        שמור וסיים — לילה טוב
      </button>
    </div>
  )
}

// ─── Beat E5: Evening Closing Card ───────────────────────────────────────────
function BeatE5({ onDone }) {
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 1200)
    return () => clearTimeout(t)
  }, []) // runs once on mount — ref keeps callback current

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 bg-slate-900" style={{ borderRadius: '0 0 1rem 1rem' }}>
      <p className="text-base font-black text-white text-center">נתראה בבוקר.</p>
    </div>
  )
}

// ─── Main EveningRitual Component ─────────────────────────────────────────────
export default function EveningRitual({ onClose, tasks, streakStage }) {
  const today = new Date().toDateString()

  // Read morning intent
  const intentText = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(INTENT_KEY) || 'null')
      if (!raw) return null
      return raw.date === today ? raw.text : null
    } catch { return null }
  }, [today])

  // Done count for today
  const doneCount = useMemo(() => {
    const sot = new Date()
    sot.setHours(0, 0, 0, 0)
    return (tasks || []).filter(t => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= sot).length
  }, [tasks])

  // Empty day: no completions and no morning intent
  const isEmpty = doneCount === 0 && !intentText

  // State machine: e1 | e2 | e3 | e4
  const [beat, setBeat]           = useState('e1')
  const [intentMet, setIntentMet] = useState(null)
  const [insightText, setInsightText] = useState('')
  const [autoSeed, setAutoSeed]   = useState('')

  // Escape to close (only on e1/e2)
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape' && beat !== 'e3' && beat !== 'e4' && beat !== 'e5') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose, beat])

  function handleE1Select(answer) {
    setIntentMet(answer)
    setBeat('e2')
  }

  function handleE2Commit(text) {
    setInsightText(text)
    setBeat('e3')
  }

  function handleE2Skip() {
    setInsightText('')
    setBeat('e3')
  }

  // E3 → save ritual completion data → advance to E4
  // Ritual is marked complete HERE (not at E4 save), so skipping E4 still counts
  function handleAdvanceToE4() {
    try { localStorage.setItem(EVENING_DATE_KEY, today) } catch {}
    try {
      localStorage.setItem(DAILY_REVIEW_KEY, JSON.stringify({
        date: today,
        morningIntent: intentText,
        intentMet,
        insight: insightText,
      }))
    } catch {}
    incrementEveningCount()
    const seed = generateSeed(intentText, intentMet, insightText, tasks)
    setAutoSeed(seed)
    setBeat('e4')
  }

  // E4 → save nightly seed → show closing card (E5)
  function handleE4Save(text, source) {
    if (text) {
      const d = new Date()
      const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` // local YYYY-MM-DD
      try { localStorage.setItem(NIGHTLY_SEED_KEY, JSON.stringify({ text, date, source })) } catch {}
    }
    setBeat('e5')
  }

  const isDark = beat === 'e3' || beat === 'e4' || beat === 'e5'
  const beatLabel = beat === 'e1' ? '1' : beat === 'e2' ? '2' : beat === 'e3' ? '3' : '4'

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/60 px-3 pb-2 md:pb-0 md:px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '85dvh' }}>

        {/* Header — hidden during E5 closing card */}
        <div className={`flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'} ${beat === 'e5' ? 'hidden' : ''}`}>
          <div>
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              🌙 סגירת יום
            </h3>
            {!isDark && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                שלב {beatLabel} מתוך 4
              </p>
            )}
          </div>
          {!isDark && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Beat content */}
        <div className={`flex flex-col overflow-y-auto ${isDark ? 'bg-slate-900 flex-1' : 'flex-1'}`}>
          {beat === 'e1' && (
            <BeatE1 intentText={intentText} onSelect={handleE1Select} />
          )}

          {beat === 'e2' && (
            <BeatE2 onCommit={handleE2Commit} onSkip={handleE2Skip} />
          )}

          {beat === 'e3' && (
            <BeatE3 doneCount={doneCount} streakStage={streakStage} onFinish={handleAdvanceToE4} />
          )}

          {beat === 'e4' && (
            <BeatE4 autoSeed={autoSeed} isEmpty={isEmpty} onSave={handleE4Save} />
          )}

          {beat === 'e5' && (
            <BeatE5 onDone={onClose} />
          )}
        </div>
      </div>
    </div>
  )
}
