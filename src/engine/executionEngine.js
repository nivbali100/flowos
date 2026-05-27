/**
 * Execution Engine — computes which task to work on next.
 *
 * Score formula (0–100):
 *   impact    × 0.35   (priority/impactScore)
 *   urgency   × 0.25   (deadline proximity or urgencyScore)
 *   energy    × 0.20   (energyMatch vs current time-of-day)
 *   clarity   × 0.15   (how well-defined the task is)
 *   avoidance × 0.05   (penalty for tasks touched many times but not done)
 *
 * Hard priority overrides (checked before scoring):
 *   1. Currently doing task → keep it
 *   2. Has explicit deadline today
 *   3. Is Big 3 and status = today
 *   4. High avoidance signal (touched 4+ times, not done)
 */

// ─── Constants ─────────────────────────────────────────────────────────────
import { STUCK_HARD_HOURS } from '../constants/app.js'
const HOUR = 60 * 60 * 1000

/** Map legacy priority string → impactScore 1-5 */
const PRIORITY_TO_SCORE = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
}

/** Energy match based on time of day */
function energyMatchScore(task) {
  const hour = new Date().getHours()
  const energy = task.energyLevel || task.energy

  if (!energy) return 0.6 // neutral if unset

  // Morning (6-11): prefer deep work
  if (hour >= 6 && hour < 12) {
    return energy === 'deep' ? 1.0 : 0.4
  }
  // Afternoon (12-17): mixed
  if (hour >= 12 && hour < 17) {
    return energy === 'quick' ? 0.9 : 0.7
  }
  // Evening (17+): prefer quick
  return energy === 'quick' ? 1.0 : 0.5
}

/** Clarity score: how well-defined is this task? */
function clarityScore(task) {
  let score = 0.5
  if (task.description && task.description.length > 20) score += 0.2
  if (task.estimatedMinutes && task.estimatedMinutes > 0) score += 0.2
  if (task.goalRef) score += 0.1
  return Math.min(1.0, score)
}

/** Avoidance penalty: tasks that keep being deferred */
function avoidancePenalty(task) {
  const touches = task.touchCount || task.postponedCount || 0
  if (touches === 0) return 0
  if (touches === 1) return 0.1
  if (touches === 2) return 0.2
  if (touches === 3) return 0.35
  return 0.5 // 4+ touches = strong avoidance signal
}

/** Urgency score from deadline or urgencyScore field */
function urgencyScore(task) {
  // New urgencyScore field (1-5)
  if (task.urgencyScore) return (task.urgencyScore - 1) / 4

  // Due-date proximity — field is 'dueDate' in the task model
  const dueField = task.dueDate || task.deadline  // support legacy 'deadline' too
  if (dueField) {
    const msLeft = new Date(dueField).getTime() - Date.now()
    if (msLeft <= 0) return 1.0           // overdue
    if (msLeft <= 24 * HOUR) return 0.95  // due today
    if (msLeft <= 3 * 24 * HOUR) return 0.7
    if (msLeft <= 7 * 24 * HOUR) return 0.4
  }

  // Default by status
  if (task.status === 'today') return 0.7
  if (task.status === 'week') return 0.4
  return 0.2
}

/** Impact score from impactScore field or legacy priority */
function impactScore(task) {
  if (task.impactScore) return (task.impactScore - 1) / 4
  const p = PRIORITY_TO_SCORE[task.priority] || 3
  return (p - 1) / 4
}

// ─── Main scorer ────────────────────────────────────────────────────────────

/**
 * Compute a 0–100 execution score for a single task.
 * @param {object} task
 * @returns {number}
 */
export function computeExecutionScore(task) {
  const impact   = impactScore(task)
  const urgency  = urgencyScore(task)
  const energy   = energyMatchScore(task)
  const clarity  = clarityScore(task)
  const avoid    = avoidancePenalty(task)

  const raw =
    impact  * 0.35 +
    urgency * 0.25 +
    energy  * 0.20 +
    clarity * 0.15 -
    avoid   * 0.05

  return Math.round(Math.max(0, Math.min(1, raw)) * 100)
}

// ─── Decision engine ────────────────────────────────────────────────────────

/**
 * Given all tasks, return the single best task to work on now.
 * Returns null if nothing actionable.
 *
 * @param {object[]} tasks  - all tasks from store
 * @returns {{ task: object, reason: string, score: number } | null}
 */
export function getNextBestTask(tasks) {
  // 1. Already doing something → keep it
  const doing = tasks.find(t => t.status === 'doing')
  if (doing) {
    return {
      task: doing,
      reason: 'כרגע בביצוע',
      score: computeExecutionScore(doing),
    }
  }

  const active = tasks.filter(t =>
    t.status === 'today' || t.status === 'week'
  )
  if (active.length === 0) return null

  // 2. Due today (hard override) — field is 'dueDate', legacy 'deadline' also supported
  const deadlineToday = active.find(t => {
    const dueField = t.dueDate || t.deadline
    if (!dueField) return false
    const ms = new Date(dueField).getTime() - Date.now()
    return ms <= 24 * HOUR && ms > 0
  })
  if (deadlineToday) {
    return {
      task: deadlineToday,
      reason: 'דדליין היום',
      score: 100,
    }
  }

  // 3. Big 3 in today (hard override — first unstarted)
  const big3Today = active.find(t => t.isBigThree && t.status === 'today')
  if (big3Today) {
    return {
      task: big3Today,
      reason: 'Big 3 — פוקוס יומי',
      score: 95,
    }
  }

  // 4. Score all and pick top — but check for avoidance flag first
  const highAvoidance = active.find(t => (t.touchCount || t.postponedCount || 0) >= 4)
  if (highAvoidance) {
    return {
      task: highAvoidance,
      reason: 'נדחתה 4+ פעמים — זמן להחליט',
      score: computeExecutionScore(highAvoidance),
    }
  }

  // 5. Score all and return best
  const scored = active.map(t => ({
    task: t,
    score: computeExecutionScore(t),
    reason: reasonFromTask(t),
  }))
  scored.sort((a, b) => b.score - a.score)

  return scored[0]
}

/**
 * Human-readable reason + tag for why this task was selected.
 * Merges coaching context from legacy pickNextBest into the engine.
 */
function reasonFromTask(task) {
  const hour = new Date().getHours()
  const energy = task.energyLevel || task.energy

  if (task.priority === 'critical' || (task.impactScore || 0) >= 4) return 'עדיפות גבוהה'
  if (energy === 'deep' && hour < 12) return 'אנרגיה עמוקה — בוקר אידיאלי'
  if (energy === 'quick' && hour >= 17) return 'משימה מהירה לסוף יום'
  if (task.goalRef) return 'מחוברת ליעד'
  return 'ציון עדיפות גבוה'
}

function tagFromResult(task, overrideTag) {
  if (overrideTag) return overrideTag
  if (task.isBigThree)           return '★ Big 3'
  if (task.status === 'doing')   return '⚡ בביצוע'
  if (task.priority === 'critical') return '🔴 קריטי'
  return 'הבא'
}

const TAG_COLORS = {
  '★ Big 3':    'bg-brand-100 text-brand-700',
  '⚡ בביצוע':  'bg-purple-100 text-purple-700',
  '🔴 קריטי':   'bg-red-100 text-red-700',
  '⚠ תקוע':    'bg-red-100 text-red-700',
  'הבא':        'bg-brand-100 text-brand-700',
}

/**
 * Single unified decision engine with coaching context.
 * Replaces both getNextBestTask() + pickNextBest() in Weekly/index.jsx.
 * Always filters out archived tasks.
 *
 * @param {object[]} tasks
 * @param {{ noGoalCount?: number }} [context] - optional summary context
 * @returns {{ task, reason, score, tag, tagColor } | null}
 */
export function getNextBestTaskWithContext(tasks, context = {}) {
  // Never surface archived tasks
  const liveTasks = tasks.filter(t => !t.archivedAt)

  // 1. Already doing — keep it
  const doing = liveTasks.find(t => t.status === 'doing')
  if (doing) {
    const stuckHours = doing.doingStartedAt
      ? (Date.now() - new Date(doing.doingStartedAt).getTime()) / 3_600_000
      : 0
    if (stuckHours > STUCK_HARD_HOURS) {
      return { task: doing, reason: `בביצוע מעל 24 שעות — סגור, פרק, או בטל`, score: computeExecutionScore(doing), tag: '⚠ תקוע', tagColor: TAG_COLORS['⚠ תקוע'] }
    }
    return { task: doing, reason: 'כרגע בביצוע', score: computeExecutionScore(doing), tag: '⚡ בביצוע', tagColor: TAG_COLORS['⚡ בביצוע'] }
  }

  const active = liveTasks.filter(t => t.status === 'today' || t.status === 'week')
  if (active.length === 0) return null

  // 2. Due today
  const dueToday = active.find(t => {
    const d = t.dueDate || t.deadline
    if (!d) return false
    const ms = new Date(d).getTime() - Date.now()
    return ms <= 24 * HOUR && ms > 0
  })
  if (dueToday) return { task: dueToday, reason: 'דדליין היום', score: 100, tag: '🔴 דדליין', tagColor: 'bg-red-100 text-red-700' }

  // 3. Big 3 in today (unstarted)
  const big3Today = active.find(t => t.isBigThree && t.status === 'today')
  if (big3Today) {
    const extraCtx = (context.noGoalCount || 0) >= 3 ? ` (יש ${context.noGoalCount} ללא יעד — הגדולים קודם)` : ''
    return { task: big3Today, reason: `זה ה-Big 3 הפתוח שלך — תתחיל עם זה${extraCtx}`, score: 95, tag: '★ Big 3', tagColor: TAG_COLORS['★ Big 3'] }
  }

  // 4. Critical in today/week
  const critical = active.find(t => (t.priority === 'critical') && (t.status === 'today' || t.status === 'week'))
  if (critical) return { task: critical, reason: 'משימה קריטית מחכה — אל תן לה לחכות', score: 92, tag: '🔴 קריטי', tagColor: TAG_COLORS['🔴 קריטי'] }

  // 5. High avoidance (deferred 4+ times)
  const highAvoidance = active.find(t => (t.touchCount || 0) >= 4)
  if (highAvoidance) return { task: highAvoidance, reason: 'נדחתה 4+ פעמים — זמן להחליט', score: computeExecutionScore(highAvoidance), tag: '⚠ נמנע', tagColor: 'bg-amber-100 text-amber-700' }

  // 6. Score all and return best
  const scored = active.map(t => ({
    task: t,
    score: computeExecutionScore(t),
    reason: reasonFromTask(t),
    tag: tagFromResult(t, null),
  }))
  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  return { ...best, tagColor: TAG_COLORS[best.tag] || TAG_COLORS['הבא'] }
}

/**
 * Returns top-N ranked tasks (for "what to do today" planning).
 * @param {object[]} tasks
 * @param {number} limit
 * @returns {{ task: object, score: number, reason: string }[]}
 */
export function rankTasksForToday(tasks, limit = 5) {
  const active = tasks.filter(t =>
    t.status === 'today' || t.status === 'week' || t.status === 'backlog'
  )
  return active
    .map(t => ({ task: t, score: computeExecutionScore(t), reason: reasonFromTask(t) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
