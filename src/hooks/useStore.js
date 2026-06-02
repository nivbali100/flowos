/**
 * useStore — mutable localStorage-backed store for all user data.
 * Starts EMPTY — user fills data through the Setup wizard on first run.
 * All mutations persist immediately to localStorage.
 */
import { useState, useCallback, createContext, useContext, createElement, useEffect } from 'react'
import { syncGoalsToSupabase, upsertCoach, syncTaskToSupabase, deleteTaskFromSupabase, fetchTasksForCoach } from '../lib/supabase.js'
import { getAuthEmailSync } from '../lib/auth.js'
import { XP_VALUES } from '../constants/app.js'
import { emitTaskEvent, emitEvent, EVENT_TYPES } from '../utils/events.js'
import { enqueueExecutionEvent, clearExecutionSyncCursor } from '../services/executionSync.js'
import { makeExecutionEvent, getWeekId, EXECUTION_EVENT_TYPES as EET } from '../domain/executionSchema.js'
import { useExecutionSync } from './useExecutionSync.js'

/**
 * Resolve the coach email for Supabase operations.
 * Priority: 1) Supabase auth session (most reliable)
 *           2) FlowOS profile in localStorage (local-only / no-auth mode)
 * This prevents desync when a user's auth email differs from their old profile email.
 */
function getCoachEmail() {
  const authEmail = getAuthEmailSync()
  if (authEmail) return authEmail
  try { return JSON.parse(localStorage.getItem('flowos_profile') || '{}')?.email || null }
  catch { return null }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function load(key, fallback) {
  try {
    const s = localStorage.getItem(key)
    return s ? JSON.parse(s) : fallback
  } catch { return fallback }
}

let _storageWarned = false
function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    _storageWarned = false   // reset on success
  } catch (e) {
    // localStorage is full or unavailable — warn the user once per session
    if (!_storageWarned) {
      _storageWarned = true
      console.error('[FlowOS] localStorage write failed:', e)
      // Fire a custom event so the UI can show a toast (non-blocking)
      try {
        window.dispatchEvent(new CustomEvent('flowos:storage-full', { detail: { key } }))
      } catch {}
    }
  }
}

// ─── Startup migrations (called from main.jsx, not as side-effect IIFEs) ──────

export function migrateStoreLegacy() {
  // 1. Clear old Lior/Eden seed data
  try {
    const stored = JSON.parse(localStorage.getItem('flowos_profile') || 'null')
    const isOldSeed =
      stored?.email === 'lior@example.com' ||
      stored?.name  === 'ליאור כהן' ||
      stored?.email === 'eden@example.com'
    if (isOldSeed) {
      Object.keys(localStorage)
        .filter(k => k.startsWith('flowos_'))
        .forEach(k => localStorage.removeItem(k))
      return  // profile nuked — nothing more to migrate
    }
  } catch {}

  // 2. Migrate old pattern fields → blockingPatterns[]
  try {
    const stored = JSON.parse(localStorage.getItem('flowos_profile') || 'null')
    if (!stored?.startingPoint) return
    const sp = stored.startingPoint
    let changed = false

    if (sp.mainPattern && !Array.isArray(sp.blockingPatterns)) {
      sp.blockingPatterns = sp.mainPattern.trim() ? [sp.mainPattern.trim()] : []
      delete sp.mainPattern
      changed = true
    }

    if (sp.whereStuck && sp.whereStuck.trim() &&
        (!Array.isArray(sp.blockingPatterns) || sp.blockingPatterns.length === 0)) {
      sp.blockingPatterns = [sp.whereStuck.trim()]
      changed = true
    }

    if (!Array.isArray(sp.blockingPatterns)) {
      sp.blockingPatterns = []
      changed = true
    }

    if (changed) localStorage.setItem('flowos_profile', JSON.stringify(stored))
  } catch {}
}

// ─── Blank defaults — user fills via Setup ────────────────────────────────────
const DEFAULT_PROFILE   = {}
const DEFAULT_QUARTERLY = {}
const DEFAULT_MONTHLY   = {}

// ─── AI task analysis (rule-based; swap for Claude API later) ─────────────────
export function analyzeTask(title = '', monthly = {}) {
  const t = title.toLowerCase()
  const monthName = monthly?.month || 'החודש'
  const revenue = monthly?.revenueTarget
    ? `₪${monthly.revenueTarget.toLocaleString()}`
    : 'היעד החודשי'

  if (t.includes('שיחה') || t.includes('מכירה') || t.includes('לסגור') || t.includes('לקוח')) {
    return `💰 ישירות מניע את ${revenue} — תעדף ראשון`
  }
  if (t.includes('סרטון') || t.includes('רילס') || t.includes('תוכן') || t.includes('פוסט')) {
    return `📣 תוכן → לידים → הכנסות. ROI גבוה לטווח ארוך`
  }
  if (t.includes('שיווק') || t.includes('פרסום') || t.includes('מודעה') || t.includes('קמפיין')) {
    return `🎯 שיווק — וודא שמחובר ליעד קיים לפני שמשקיע זמן`
  }
  if (t.includes('חשבונית') || t.includes('אדמין') || t.includes('בירוקר') || t.includes('ניהול')) {
    return `🗂️ אדמין — נסה לאחד כמה משימות כאלו ביום אחד`
  }
  if (t.includes('למד') || t.includes('קורס') || t.includes('ספר') || t.includes('הדרכה')) {
    return `📚 למידה — השקעה עצמית. קבע זמן קבוע ואל תחצה שעה`
  }
  if (t.includes('פגישה') || t.includes('שיחה') || t.includes('zoom') || t.includes('call')) {
    return `🤝 פגישה — הכן אג'נדה ברורה מראש לחסוך זמן לשניכם`
  }
  return `📋 בדוק שמשימה זו קשורה ל-3 המהלכים הגדולים של ${monthName}`
}

// ─── Weekly pattern insight ───────────────────────────────────────────────────
export function analyzeWeek(tasks = [], monthly = {}) {
  const done     = tasks.filter(t => t.status === 'done')
  const backlog  = tasks.filter(t => t.status === 'backlog')
  const today    = tasks.filter(t => t.status === 'today')
  const total    = tasks.length
  const donePct  = total > 0 ? Math.round((done.length / total) * 100) : 0

  const hasStaleToday = today.some(t => {
    if (!t.movedToTodayAt) return false
    const hours = (Date.now() - new Date(t.movedToTodayAt).getTime()) / 3600000
    return hours > 20
  })

  const staleSalesTasks = backlog.filter(t => {
    const title = (t.title || '').toLowerCase()
    return title.includes('שיחה') || title.includes('מכירה') || title.includes('לסגור')
  })

  if (staleSalesTasks.length > 0) {
    return `⚡ ${staleSalesTasks.length} משימות מכירה ברשימת הרעיונות — אלו מניעות הכנסות ישירות. תעבר אותן ל"היום" עכשיו.`
  }
  if (hasStaleToday) {
    return `📌 יש משימות שנמצאות ב"היום" מאתמול — זה סימן לחסם. מה עוצר? הזז או בטל.`
  }
  if (total === 0) {
    return `✨ לוח ריק — רגע טוב להוסיף 3-5 משימות מהיעדים החודשיים שלך.`
  }
  if (donePct >= 70) {
    return `🏆 ${donePct}% מהמשימות הושלמו — שבוע חזק! המשך את הקצב הזה.`
  }
  if (donePct < 30 && total > 4) {
    return `🔍 רק ${donePct}% הושלמו — אולי יש יותר מדי? צמצם ל-5 מרכזיות ותן להן עדיפות מלאה.`
  }
  if (backlog.length > 8) {
    return `⚠️ ${backlog.length} רעיונות ברשימה — עדיף להחליט מה לא לעשות מאשר לנהל רשימה גדולה.`
  }
  return `📊 ${done.length} בוצע, ${today.length} להיום, ${backlog.length} ברשימה.`
}

// ─── Suggest tasks from monthly key moves ────────────────────────────────────
export function suggestFromGoals(monthly = {}, existingTasks = []) {
  const moves = monthly?.threeKeyMoves || []
  const existingTitles = existingTasks.map(t => t.title?.toLowerCase())

  return moves
    .filter(move => !existingTitles.some(t => t.includes(move.toLowerCase().slice(0, 10))))
    .map((move, i) => ({
      id:       `goal-suggest-${i}`,
      title:    move,
      goalRef:  `מהלך מרכזי ${i + 1}`,
      source:   'goal',
    }))
}

// ─── XP helpers ───────────────────────────────────────────────────────────────

function addXP(points) {
  try {
    const current = Number(localStorage.getItem('flowos_xp') || 0)
    localStorage.setItem('flowos_xp', String(current + points))
  } catch {}
}

function updateStreak() {
  try {
    const today = new Date().toDateString()
    const raw = JSON.parse(localStorage.getItem('flowos_streak') || '{"days":0,"lastDate":null}')
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    if (raw.lastDate === today) return raw.days          // already counted
    const newDays = raw.lastDate === yesterday ? raw.days + 1 : 1
    const next = { days: newDays, lastDate: today }
    localStorage.setItem('flowos_streak', JSON.stringify(next))
    return newDays
  } catch { return 0 }
}

export function getXP() {
  return Number(localStorage.getItem('flowos_xp') || 0)
}

export function getStreak() {
  try {
    return JSON.parse(localStorage.getItem('flowos_streak') || '{"days":0,"lastDate":null}')
  } catch { return { days: 0, lastDate: null } }
}

// ─── Context + Provider ───────────────────────────────────────────────────────
const StoreContext = createContext(null)

/**
 * StoreProvider — wrap the app root once so all descendants share
 * a single store instance (single source of truth).
 */
export function StoreProvider({ children }) {
  const store = useStoreInternal()
  return createElement(StoreContext.Provider, { value: store }, children)
}

/**
 * useStore — consume the singleton store from anywhere in the tree.
 * Throws if used outside StoreProvider (fail-fast in development).
 */
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('[FlowOS] useStore must be used within <StoreProvider>')
  return ctx
}

// ─── Internal hook (single instance, owned by StoreProvider) ─────────────────
function useStoreInternal() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [profile,       setProfileState]   = useState(() => load('flowos_profile',   DEFAULT_PROFILE))
  const [quarterly,     setQuarterlyState] = useState(() => load('flowos_quarterly', DEFAULT_QUARTERLY))
  const [monthly,       setMonthlyState]   = useState(() => load('flowos_monthly',   DEFAULT_MONTHLY))
  const [tasks,         setTasksState]     = useState(() => {
    const raw = load('flowos_tasks', [])
    // One-time cleanup: remove ghost 'cancelled' tasks (legacy bug — they render in no column)
    const hasCancelled = raw.some(t => t.status === 'cancelled')
    if (hasCancelled) {
      const cleaned = raw.filter(t => t.status !== 'cancelled')
      try { localStorage.setItem('flowos_tasks', JSON.stringify(cleaned)) } catch {}
      return cleaned
    }
    return raw
  })
  const [xp,            setXpState]        = useState(() => getXP())
  const [streak,        setStreakState]     = useState(() => getStreak())
  const [setupComplete, setSetupComplete]  = useState(() => !!localStorage.getItem('flowos_setup_complete'))

  // Read-back from Supabase on startup if localStorage is empty.
  // Uses auth session email as fallback so cross-device users recover their data
  // even when flowos_profile hasn't been written to this device yet.
  useEffect(() => {
    const email = profile?.email || getAuthEmailSync()
    if (!email || tasks.length > 0) return
    fetchTasksForCoach(email).then(remoteTasks => {
      if (!remoteTasks?.length) return
      setTasksState(remoteTasks)
      persist('flowos_tasks', remoteTasks)
      // Emit synthetic task_created events so execution_events reflects the
      // restored snapshot. applyTaskCreated is idempotent — safe to re-emit.
      // Without this, tasks restored from flowos_tasks are invisible to Nivos.
      const weekId = getWeekId()
      remoteTasks.forEach(task => {
        void enqueueExecutionEvent(makeExecutionEvent(
          EET.TASK_CREATED,
          {
            task_id:      task.id,
            title:        task.title        || '',
            status:       task.status       || 'backlog',
            priority:     task.priority     || null,
            is_big_three: task.isBigThree   || false,
            goal_ref:     task.goalRef      || null,
            goal_type:    task.goalType     || null,
            energy_level: task.energyLevel  || null,
            touch_count:  task.touchCount   || 0,
            source:       'synced',
          },
          email,
          { taskId: task.id, weekId },
        ))
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.email]) // intentionally only re-run when email changes

  // Multi-tab sync: re-sync tasks/profile when another tab writes to localStorage
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === 'flowos_tasks' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue)
          setTasksState(updated)
        } catch {}
      }
      if (e.key === 'flowos_profile' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue)
          setProfileState(updated)
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // ── Execution timeline sync (login restore + offline queue flush) ──────────
  // onRestore: called after replay with the reconstituted FounderExecutionState.
  // We use the replayed touchCount as the authoritative source — it counts actual
  // deferral events, whereas localStorage may have stale/reset values.
  const _onExecRestore = useCallback((execState, nivosState) => {
    if (execState.eventCount === 0) return
    console.log(
      '[FlowOS:sync] timeline restored —', execState.eventCount, 'events',
      '| trend:', nivosState.trend,
      '| completion7d:', Math.round(nivosState.completionRate7d * 100) + '%'
    )
    // Backfill touchCount from replay into localStorage tasks (accurate avoidance detection)
    setTasksState(prev => {
      let changed = false
      const patched = prev.map(t => {
        const replayed = execState.tasks[t.id]
        if (!replayed) return t
        if (replayed.touchCount > (t.touchCount || 0)) {
          changed = true
          return { ...t, touchCount: replayed.touchCount }
        }
        return t
      })
      if (changed) {
        persist('flowos_tasks', patched)
        return patched
      }
      return prev
    })
  }, []) // setTasksState is stable; no deps needed

  const _syncUserEmail = profile?.email || getAuthEmailSync() || null
  useExecutionSync(_syncUserEmail, _onExecRestore)

  // ── Profile mutations ──────────────────────────────────────────────────────
  const updateStartingPoint = useCallback((field, value) => {
    setProfileState(prev => {
      const next = { ...prev, startingPoint: { ...prev.startingPoint, [field]: value } }
      persist('flowos_profile', next)
      return next
    })
  }, [])

  // Update top-level profile fields (name, email, businessName, etc.)
  // Re-syncs to Supabase automatically
  const updateProfile = useCallback((fields) => {
    let nextProfile = null
    setProfileState(prev => {
      const next = { ...prev, ...fields }
      persist('flowos_profile', next)
      nextProfile = next
      return next
    })
    // Side effect outside state updater
    if (nextProfile?.email) {
      upsertCoach({
        email:        nextProfile.email,
        name:         nextProfile.name,
        business_name: nextProfile.businessName,
        track:        'ליווי',
        status:       'active',
      })
    }
  }, [])

  const updateAnnualGoals = useCallback((field, value) => {
    let next = null
    setProfileState(prev => {
      next = { ...prev, annualGoals: { ...prev.annualGoals, [field]: value } }
      persist('flowos_profile', next)
      return next
    })
    if (next?.email) syncGoalsToSupabase(next.email, { annualGoals: next.annualGoals })
  }, [])

  // ── Quarterly mutations ────────────────────────────────────────────────────
  const updateQuarterly = useCallback((field, value) => {
    let next = null
    setQuarterlyState(prev => {
      next = { ...prev, [field]: value }
      persist('flowos_quarterly', next)
      return next
    })
    const email = getCoachEmail()
    if (email && next) syncGoalsToSupabase(email, { quarterly: next })
  }, [])

  const updateQuarterlyMove = useCallback((idx, value) => {
    let next = null
    setQuarterlyState(prev => {
      const moves = [...(prev.threeKeyMoves || ['', '', ''])]
      moves[idx] = value
      next = { ...prev, threeKeyMoves: moves }
      persist('flowos_quarterly', next)
      return next
    })
    const email = getCoachEmail()
    if (email && next) syncGoalsToSupabase(email, { quarterly: next })
  }, [])

  // ── Monthly mutations ──────────────────────────────────────────────────────
  const updateMonthly = useCallback((field, value) => {
    let next = null
    setMonthlyState(prev => {
      next = { ...prev, [field]: value }
      persist('flowos_monthly', next)
      return next
    })
    const email = getCoachEmail()
    if (email && next) syncGoalsToSupabase(email, { monthly: next })
  }, [])

  // Update an actual KPI value (revenue/leads/calls/closures) — real user data
  const updateMonthlyActual = useCallback((kpi, value) => {
    setMonthlyState(prev => {
      const actualKPIs = { ...(prev.actualKPIs || {}), [kpi]: Number(value) || 0 }
      const next = { ...prev, actualKPIs }
      persist('flowos_monthly', next)
      return next
    })
  }, [])

  const updateMonthlyMove = useCallback((idx, value) => {
    let next = null
    setMonthlyState(prev => {
      const moves = [...(prev.threeKeyMoves || ['', '', ''])]
      moves[idx] = value
      next = { ...prev, threeKeyMoves: moves }
      persist('flowos_monthly', next)
      return next
    })
    const email = getCoachEmail()
    if (email && next) syncGoalsToSupabase(email, { monthly: next })
  }, [])

  // ── Task CRUD ──────────────────────────────────────────────────────────────
  const addTask = useCallback((taskData) => {
    const now = new Date().toISOString()
    const task = {
      id:               (typeof crypto !== 'undefined' && crypto.randomUUID)
                          ? crypto.randomUUID()
                          : (Date.now().toString(36) + Math.random().toString(36).slice(2)),
      title:            taskData.title || '',
      description:      taskData.description || '',
      type:             taskData.type || 'strategy',       // strategy|sales|marketing|content|operations|finance|mindset|personal
      priority:         taskData.priority || 'medium',     // low|medium|high|critical
      owner:            taskData.owner || 'trainee',       // trainee|coach
      isBigThree:       taskData.isBigThree || false,
      goalRef:          taskData.goalRef || '',
      goalType:         taskData.goalType || 'none',       // quarterly|monthly|none
      estimatedMinutes: taskData.estimatedMinutes || null,
      notes:            taskData.notes || '',
      source:           taskData.source || 'manual',
      status:           taskData.status || 'backlog',      // backlog|week|today|doing|done
      aiAnalysis:       taskData.aiAnalysis || null,
      createdAt:        now,
      updatedAt:        now,
      completedAt:      null,
      movedToTodayAt:   taskData.status === 'today' ? now : null,
      // Phase 2 fields
      energyLevel:      taskData.energyLevel    || null,   // 'deep' | 'quick' | null
      doingStartedAt:   null,
      actualMinutes:    null,
      // v2 fields
      impactScore:      taskData.impactScore    || null,   // 1-5
      urgencyScore:     taskData.urgencyScore   || null,   // 1-5
      resistanceLevel:  taskData.resistanceLevel || null,  // 1-5
      clarityLevel:     taskData.clarityLevel   || null,   // 1-5
      effortMinutes:    taskData.effortMinutes  || taskData.estimatedMinutes || null,
      touchCount:       0,
      subtasks:         taskData.subtasks       || [],
      completionDefinition: taskData.completionDefinition || null,
      blocker:          taskData.blocker        || null,
      outcomeType:      taskData.outcomeType    || null,
      _v2:              true,
    }
    setTasksState(prev => {
      const next = [task, ...prev]
      persist('flowos_tasks', next)
      return next
    })
    // fire-and-forget sync + events
    const email = getCoachEmail()
    syncTaskToSupabase(task, email)
    emitTaskEvent(EVENT_TYPES.TASK_CREATED, task, {}, email)
    // Execution event — durable, dedup-safe, offline-queued
    if (email) {
      void enqueueExecutionEvent(makeExecutionEvent(EET.TASK_CREATED, {
        task_id:      task.id,
        title:        task.title,
        status:       task.status,
        priority:     task.priority,
        is_big_three: task.isBigThree,
        goal_ref:     task.goalRef  || null,
        goal_type:    task.goalType || null,
        energy_level: task.energyLevel || null,
        touch_count:  0,
        owner:        task.owner,
        source:       task.source,
      }, email, { taskId: task.id, weekId: getWeekId() }))
    }
    return task
  }, [])

  const updateTask = useCallback((id, updates) => {
    let updatedTask = null
    let prevTask    = null
    setTasksState(prev => {
      prevTask    = prev.find(t => t.id === id) || null
      const next  = prev.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
      persist('flowos_tasks', next)
      updatedTask = next.find(t => t.id === id) || null
      return next
    })
    // Side effects outside state updater — safe from StrictMode double-invocation
    const email = getCoachEmail()
    if (updatedTask) syncTaskToSupabase(updatedTask, email)
    // Execution event for task updates (skip purely cosmetic fields like updatedAt)
    if (email && updatedTask && prevTask) {
      const changedFields = Object.keys(updates).filter(k => k !== 'updatedAt' && updates[k] !== prevTask[k])
      if (changedFields.length > 0) {
        void enqueueExecutionEvent(makeExecutionEvent(EET.TASK_UPDATED, {
          task_id:        id,
          title:          updatedTask.title,
          status:         updatedTask.status,
          priority:       updatedTask.priority,
          is_big_three:   updatedTask.isBigThree,
          goal_ref:       updatedTask.goalRef  || null,
          goal_type:      updatedTask.goalType || null,
          changed_fields: changedFields,
          prev_title:     updates.title != null ? prevTask.title : undefined,
          prev_priority:  updates.priority != null ? prevTask.priority : undefined,
        }, email, { taskId: id, weekId: getWeekId() }))
      }
    }
  }, [])

  // ── Big 3 — max 3 tasks marked as priority ─────────────────────────────────
  const setBigThree = useCallback((id, isBig3) => {
    let affectedTask = null
    setTasksState(prev => {
      const currentCount = prev.filter(t => t.isBigThree && t.id !== id).length
      if (isBig3 && currentCount >= 3) return prev   // limit enforced — caller should show error
      const next = prev.map(t =>
        t.id === id ? { ...t, isBigThree: isBig3, updatedAt: new Date().toISOString() } : t
      )
      persist('flowos_tasks', next)
      affectedTask = next.find(t => t.id === id) || null
      return next
    })
    // Execution event outside state updater
    const email = getCoachEmail()
    if (email && affectedTask) {
      void enqueueExecutionEvent(makeExecutionEvent(EET.BIG3_SET, {
        task_id:      id,
        title:        affectedTask.title,
        is_big_three: isBig3,
        week_id:      getWeekId(),
      }, email, { taskId: id, weekId: getWeekId() }))
    }
  }, [])

  const deleteTask = useCallback((id) => {
    // Capture email before state setter to avoid calling Supabase inside a React state updater
    const email = getCoachEmail()
    let deletedTask = null
    setTasksState(prev => {
      deletedTask = prev.find(t => t.id === id) || null   // capture before filter
      const next  = prev.filter(t => t.id !== id)
      persist('flowos_tasks', next)
      return next
    })
    // Fire-and-forget outside the state setter — safe from React batching issues
    deleteTaskFromSupabase(id, email)
    emitEvent(EVENT_TYPES.TASK_DELETED, { task_id: id }, email)
    // Execution event — durable delete record (append-only, never removes the event)
    if (email && deletedTask) {
      void enqueueExecutionEvent(makeExecutionEvent(EET.TASK_DELETED, {
        task_id: id,
        title:   deletedTask.title,
        status:  deletedTask.status,
        week_id: getWeekId(),
      }, email, { taskId: id, weekId: getWeekId() }))
    }
  }, [])

  const moveTask = useCallback((id, newStatus) => {
    // Capture result of state update to check for XP/streak side effects after
    let movedTaskResult = null
    let nextTasksSnapshot = null
    let prevStatus = null   // Fix: capture the pre-move status for accurate from_status events

    setTasksState(prev => {
      const now = new Date().toISOString()
      const next = prev.map(t => {
        if (t.id !== id) return t
        prevStatus = t.status   // capture BEFORE update (idempotent across StrictMode double-calls)
        // Deferral detection: was in today/doing, moving away without completing
        const isDeferral =
          ['today', 'doing'].includes(t.status) &&
          !['today', 'doing', 'done'].includes(newStatus)

        const updates = {
          ...t,
          status:         newStatus,
          updatedAt:      now,
          completedAt:    newStatus === 'done' ? now : t.completedAt,
          movedToTodayAt: newStatus === 'today' ? now : t.movedToTodayAt,
          // Phase 2: track doing start time
          doingStartedAt: newStatus === 'doing' ? now : t.doingStartedAt,
          // Phase 2: record actual duration when completing
          actualMinutes:  newStatus === 'done' && t.doingStartedAt
            ? Math.round((Date.now() - new Date(t.doingStartedAt).getTime()) / 60000)
            : t.actualMinutes,
          // v2: track deferrals for avoidance detection
          touchCount: isDeferral ? (t.touchCount || 0) + 1 : (t.touchCount || 0),
        }
        return updates
      })
      persist('flowos_tasks', next)
      movedTaskResult = next.find(t => t.id === id)
      nextTasksSnapshot = next
      return next
    })

    // Side effects outside the state updater — safe from React batching/StrictMode double-calls
    const coachEmail = getCoachEmail()
    if (movedTaskResult) {
      syncTaskToSupabase(movedTaskResult, coachEmail)

      // Behavioral events (existing system)
      if (newStatus === 'done') {
        emitTaskEvent(EVENT_TYPES.TASK_COMPLETED, movedTaskResult, {}, coachEmail)
        if (movedTaskResult.isBigThree) {
          emitTaskEvent(EVENT_TYPES.BIG3_COMPLETED, movedTaskResult, {}, coachEmail)
        }
      } else if (newStatus === 'doing') {
        emitTaskEvent(EVENT_TYPES.FOCUS_SESSION_STARTED, movedTaskResult, {}, coachEmail)
      } else {
        if ((movedTaskResult.touchCount || 0) > 0) {
          emitTaskEvent(EVENT_TYPES.TASK_DEFERRED, movedTaskResult, { to_status: newStatus }, coachEmail)
        } else {
          emitTaskEvent(EVENT_TYPES.TASK_MOVED, movedTaskResult, { to_status: newStatus }, coachEmail)
        }
      }

      // Execution events — durable, dedup-safe, offline-queued
      if (coachEmail) {
        const weekId = getWeekId()
        const basePayload = {
          task_id:      movedTaskResult.id,
          title:        movedTaskResult.title,
          status:       newStatus,
          priority:     movedTaskResult.priority,
          is_big_three: movedTaskResult.isBigThree,
          goal_ref:     movedTaskResult.goalRef   || null,
          goal_type:    movedTaskResult.goalType  || null,
          energy_level: movedTaskResult.energyLevel || null,
          touch_count:  movedTaskResult.touchCount || 0,
        }

        if (newStatus === 'done') {
          void enqueueExecutionEvent(makeExecutionEvent(EET.TASK_COMPLETED, {
            ...basePayload,
            completed_at:     movedTaskResult.completedAt || new Date().toISOString(),
            doing_started_at: movedTaskResult.doingStartedAt || null,
            actual_minutes:   movedTaskResult.actualMinutes  || null,
            was_big_three:    movedTaskResult.isBigThree,
          }, coachEmail, { taskId: movedTaskResult.id, weekId }))
        } else {
          const isDeferral = (movedTaskResult.touchCount || 0) > 0
          void enqueueExecutionEvent(makeExecutionEvent(EET.TASK_MOVED, {
            ...basePayload,
            from_status: prevStatus || 'unknown',   // Fix: use captured prevStatus, not __prevStatus
            to_status:   newStatus,
            is_deferral: isDeferral,
          }, coachEmail, { taskId: movedTaskResult.id, weekId }))
        }
      }
    }

    // XP + streak on task completion
    if (newStatus === 'done' && nextTasksSnapshot && movedTaskResult) {
      let earned = XP_VALUES.task_done

      // Big3 bonus: task is marked as Big 3
      if (movedTaskResult.isBigThree) {
        earned += XP_VALUES.big3_done
      }

      addXP(earned)
      updateStreak()
      setXpState(getXP())
      setStreakState(getStreak())

      // Perfect day bonus: all active tasks (today + doing) are done — none left in progress
      // Only award once per day (guard: check if perfect_day already awarded today)
      const remaining = nextTasksSnapshot.filter(t => t.status === 'today' || t.status === 'doing').length
      const hasDoneToday = nextTasksSnapshot.some(t => t.status === 'done' &&
        t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString())
      const perfectDayKey = `flowos_perfect_day_${new Date().toDateString()}`
      if (remaining === 0 && hasDoneToday && !localStorage.getItem(perfectDayKey)) {
        localStorage.setItem(perfectDayKey, '1')
        addXP(XP_VALUES.perfect_day)
        setXpState(getXP())
      }
    }
  }, [])

  // ── Restore a previously-deleted task (used by Undo Toast) ──────────────
  const restoreTask = useCallback((task) => {
    const email = getCoachEmail()
    let wasRestored = false
    setTasksState(prev => {
      // Don't restore if somehow still exists
      if (prev.some(t => t.id === task.id)) return prev
      wasRestored = true
      const next = [task, ...prev]
      persist('flowos_tasks', next)
      return next
    })
    // Sync to Supabase and emit execution event outside the state setter
    // (React may call state setters twice in StrictMode — guard with wasRestored)
    if (wasRestored && email) {
      syncTaskToSupabase(task, email)
      // Use TASK_REOPENED so the replay engine clears the deletedAt flag
      void enqueueExecutionEvent(makeExecutionEvent(EET.TASK_REOPENED, {
        task_id:           task.id,
        title:             task.title,
        status:            task.status,
        priority:          task.priority,
        is_big_three:      task.isBigThree || false,
        goal_ref:          task.goalRef  || null,
        goal_type:         task.goalType || null,
        energy_level:      task.energyLevel || null,
        touch_count:       task.touchCount || 0,
        prev_completed_at: task.completedAt || null,
        reason:            'undo_delete',
      }, email, { taskId: task.id, weekId: getWeekId() }))
    }
  }, [])

  // ── Reorder tasks (for within-column drag sort) ───────────────────────────
  const reorderTasks = useCallback((newTasksArray) => {
    setTasksState(newTasksArray)
    persist('flowos_tasks', newTasksArray)
    // Reorder is cosmetic — Supabase has no order column so no sync needed here.
    // (Individual task mutations already sync on status/field change.)
  }, [])

  // ── Bulk status move ──────────────────────────────────────────────────────
  const bulkMoveTask = useCallback((ids, newStatus) => {
    const idSet  = new Set(ids)
    const email  = getCoachEmail()
    let movedTasks = []
    const prevStatuses = {}  // { taskId: prevStatus } — captured before update

    setTasksState(prev => {
      const now  = new Date().toISOString()
      // Capture pre-move statuses for accurate from_status events
      for (const t of prev) {
        if (idSet.has(t.id)) prevStatuses[t.id] = t.status
      }
      const next = prev.map(t =>
        idSet.has(t.id)
          ? { ...t, status: newStatus, updatedAt: now,
              doingStartedAt: newStatus === 'doing' ? now : t.doingStartedAt,
              completedAt:    newStatus === 'done'  ? now : t.completedAt }
          : t
      )
      persist('flowos_tasks', next)
      movedTasks = next.filter(t => idSet.has(t.id))
      return next
    })
    // Side effects outside state updater
    if (email) {
      const weekId = getWeekId()
      movedTasks.forEach(t => {
        syncTaskToSupabase(t, email)
        // Execution event for each bulk-moved task
        if (newStatus === 'done') {
          void enqueueExecutionEvent(makeExecutionEvent(EET.TASK_COMPLETED, {
            task_id:          t.id,
            title:            t.title,
            status:           'done',
            priority:         t.priority,
            is_big_three:     t.isBigThree || false,
            goal_ref:         t.goalRef  || null,
            goal_type:        t.goalType || null,
            energy_level:     t.energyLevel || null,
            touch_count:      t.touchCount || 0,
            completed_at:     t.completedAt || new Date().toISOString(),
            doing_started_at: t.doingStartedAt || null,
            actual_minutes:   t.actualMinutes  || null,
            was_big_three:    t.isBigThree || false,
          }, email, { taskId: t.id, weekId }))
        } else {
          void enqueueExecutionEvent(makeExecutionEvent(EET.TASK_MOVED, {
            task_id:      t.id,
            title:        t.title,
            status:       newStatus,
            priority:     t.priority,
            is_big_three: t.isBigThree || false,
            goal_ref:     t.goalRef  || null,
            goal_type:    t.goalType || null,
            energy_level: t.energyLevel || null,
            touch_count:  t.touchCount || 0,
            from_status:  prevStatuses[t.id] || 'unknown',
            to_status:    newStatus,
            is_deferral:  false,
          }, email, { taskId: t.id, weekId }))
        }
      })
    }
    // XP + streak for bulk-done
    if (newStatus === 'done') {
      ids.forEach(() => addXP(XP_VALUES.task_done))
      updateStreak()
      setXpState(getXP())
      setStreakState(getStreak())
    }
  }, [setXpState, setStreakState])

  // ── v2: Subtask management ────────────────────────────────────────────────
  const addSubtask = useCallback((taskId, subtaskTitle) => {
    setTasksState(prev => {
      const next = prev.map(t => {
        if (t.id !== taskId) return t
        const subtask = {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID)
              ? crypto.randomUUID()
              : (Date.now().toString(36) + Math.random().toString(36).slice(2)),
          title: subtaskTitle,
          done: false,
          createdAt: new Date().toISOString(),
        }
        return { ...t, subtasks: [...(t.subtasks || []), subtask], updatedAt: new Date().toISOString() }
      })
      persist('flowos_tasks', next)
      return next
    })
  }, [])

  const toggleSubtask = useCallback((taskId, subtaskId) => {
    setTasksState(prev => {
      const next = prev.map(t => {
        if (t.id !== taskId) return t
        const subtasks = (t.subtasks || []).map(s =>
          s.id === subtaskId ? { ...s, done: !s.done } : s
        )
        return { ...t, subtasks, updatedAt: new Date().toISOString() }
      })
      persist('flowos_tasks', next)
      return next
    })
  }, [])

  const setSubtasksFromAI = useCallback((taskId, subtaskTitles) => {
    setTasksState(prev => {
      const next = prev.map(t => {
        if (t.id !== taskId) return t
        const subtasks = subtaskTitles.map((title) => ({
          id: (typeof crypto !== 'undefined' && crypto.randomUUID)
              ? crypto.randomUUID()
              : (Date.now().toString(36) + Math.random().toString(36).slice(2)),
          title,
          done: false,
          createdAt: new Date().toISOString(),
        }))
        return { ...t, subtasks, updatedAt: new Date().toISOString() }
      })
      persist('flowos_tasks', next)
      return next
    })
  }, [])

  // ── v2: Touch / avoidance tracking ───────────────────────────────────────
  /** Call whenever a task is deferred (moved away from today without completing) */
  const recordTouch = useCallback((id) => {
    setTasksState(prev => {
      const next = prev.map(t =>
        t.id === id
          ? { ...t, touchCount: (t.touchCount || 0) + 1, updatedAt: new Date().toISOString() }
          : t
      )
      persist('flowos_tasks', next)
      return next
    })
  }, [])

  // ── Setup completion — saves all wizard data in one shot ──────────────────
  const completeSetup = useCallback(({ profile: p, quarterly: q, monthly: m }) => {
    // Profile
    persist('flowos_profile', p)
    setProfileState(p)
    // Quarterly
    persist('flowos_quarterly', q)
    setQuarterlyState(q)
    // Monthly
    persist('flowos_monthly', m)
    setMonthlyState(m)
    // Mark setup done
    localStorage.setItem('flowos_setup_complete', '1')
    setSetupComplete(true)
    // fire-and-forget: register coach + sync all goals to Supabase
    if (p.email) {
      upsertCoach(p)
      syncGoalsToSupabase(p.email, {
        quarterly:   q,
        monthly:     m,
        annualGoals: p.annualGoals,
      })
    }
  }, [])

  // ── Award XP externally (e.g. MorningPlan, week-close bonus) ────────────────
  const awardXP = useCallback((points) => {
    addXP(points)
    updateStreak()
    setXpState(getXP())
    setStreakState(getStreak())
  }, [])

  // ── Close Week: archive done tasks, apply open-task decisions, award XP ──────
  // decisions = { [taskId]: 'next-week' | 'backlog' | 'delete' }
  // summary   = the week summary object (already saved by CloseWeekModal)
  const closeWeek = useCallback((decisions = {}) => {
    const email     = getCoachEmail()
    const now       = new Date().toISOString()
    const weekId    = `week-${now.slice(0, 10)}`  // e.g. "week-2026-05-28"

    let tasksToDelete = []
    // Fix: capture real week counts before mutation (were hardcoded as 0 before)
    let _completedCount = 0
    let _totalTasks     = 0
    let _big3Done       = 0
    let _big3Total      = 0

    setTasksState(prev => {
      // Capture pre-close counts from current state (authoritative for week_closed payload)
      _completedCount = prev.filter(t => t.status === 'done').length
      _totalTasks     = prev.filter(t => !t.archivedAt).length
      _big3Total      = Math.min(prev.filter(t => t.isBigThree).length, 3)
      _big3Done       = prev.filter(t => t.isBigThree && t.status === 'done').length

      const next = prev
        .filter(t => {
          // Hard-delete tasks the user decided to remove
          if (decisions[t.id] === 'delete') {
            tasksToDelete.push(t.id)
            return false
          }
          return true
        })
        .map(t => {
          // Archive completed tasks — they leave the active board
          if (t.status === 'done' && !t.archivedAt) {
            return { ...t, archivedAt: now, weekId, updatedAt: now }
          }
          // Apply open-task decisions
          if (decisions[t.id] === 'next-week') {
            return { ...t, status: 'week', isBigThree: false, updatedAt: now }
          }
          if (decisions[t.id] === 'backlog') {
            return { ...t, status: 'backlog', isBigThree: false, updatedAt: now }
          }
          // Undecided open tasks: move to backlog + clear Big3
          if (t.status !== 'done') {
            return { ...t, isBigThree: false, updatedAt: now }
          }
          return t
        })
      persist('flowos_tasks', next)
      return next
    })

    // Delete from Supabase outside state updater
    if (email) tasksToDelete.forEach(id => deleteTaskFromSupabase(id, email))

    // Award week-closed XP
    addXP(XP_VALUES.week_closed)
    updateStreak()
    setXpState(getXP())
    setStreakState(getStreak())

    // Behavioral event (existing system)
    emitEvent(EVENT_TYPES.WEEK_CLOSED, { week_id: weekId, decisions_count: Object.keys(decisions).length }, getCoachEmail())

    // Execution event — durable week_closed record with full decision map
    const execEmail = getCoachEmail()
    if (execEmail) {
      // Normalize decision keys: useStore uses 'next-week', schema uses 'next_week'
      const normalizedDecisions = {}
      for (const [tid, dec] of Object.entries(decisions)) {
        normalizedDecisions[tid] = dec === 'next-week' ? 'next_week' : dec
      }
      void enqueueExecutionEvent(makeExecutionEvent(EET.WEEK_CLOSED, {
        week_id:         weekId,
        closed_at:       now,
        completed_count: _completedCount,
        total_tasks:     _totalTasks,
        big3_done:       _big3Done,
        big3_total:      _big3Total,
        decisions:       normalizedDecisions,
        main_win:        '',
      }, execEmail, { weekId }))
    }
  }, [])

  // ── Reset (for testing / re-onboarding) ───────────────────────────────────
  const resetAll = useCallback(() => {
    Object.keys(localStorage).filter(k => k.startsWith('flowos_')).forEach(k => localStorage.removeItem(k))
    clearExecutionSyncCursor()   // also wipe exec queue + cursor
    setProfileState({})
    setQuarterlyState({})
    setMonthlyState({})
    setTasksState([])
    setXpState(0)
    setStreakState({ days: 0, lastDate: null })
    setSetupComplete(false)
  }, [])

  // ── Expose ─────────────────────────────────────────────────────────────────
  return {
    profile,
    updateProfile,
    updateStartingPoint,
    updateAnnualGoals,

    quarterly,
    updateQuarterly,
    updateQuarterlyMove,

    monthly,
    updateMonthly,
    updateMonthlyMove,
    updateMonthlyActual,

    tasks,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    setBigThree,
    bulkMoveTask,
    reorderTasks,
    restoreTask,
    addSubtask,
    toggleSubtask,
    setSubtasksFromAI,
    recordTouch,

    xp,
    streak,
    awardXP,
    closeWeek,

    setupComplete,
    completeSetup,
    resetAll,
  }
}
