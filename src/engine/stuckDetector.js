/**
 * Stuck Detector — identifies tasks that are blocked or stalled,
 * and classifies the root cause with a suggested action.
 *
 * 6 stuck reasons:
 *   unclear      — task title/description is vague, no steps defined
 *   blocked      — explicit blocker field set, or notes mention blocker
 *   waiting      — task marked as waiting on someone/something
 *   overwhelmed  — effort estimate is very high with no subtasks
 *   fear         — high resistance level, deferred many times
 *   low-priority — task is in "today" but has low priority + low energy match
 */

import { STUCK_HARD_HOURS } from '../constants/app.js'
const HOUR = 60 * 60 * 1000
const STUCK_THRESHOLD_HOURS = STUCK_HARD_HOURS   // single source: constants/app.js

// ─── Detection ──────────────────────────────────────────────────────────────

/**
 * Is this task considered "stuck"?
 * @param {object} task
 * @returns {boolean}
 */
export function detectStuck(task) {
  if (!['today', 'doing'].includes(task.status)) return false

  // Explicit blocker set
  if (task.blocker && task.blocker.trim()) return true

  // In today/doing for too long without completion
  const anchor = task.doingStartedAt || task.movedToTodayAt
  if (anchor) {
    const hoursElapsed = (Date.now() - new Date(anchor).getTime()) / HOUR
    if (hoursElapsed > STUCK_THRESHOLD_HOURS) return true
  }

  // High resistance + multiple deferrals
  const touches = task.touchCount || task.postponedCount || 0
  if (touches >= 3) return true

  // Notes contain blocker keywords
  if (containsBlockerKeywords(task.notes || '')) return true

  return false
}

/** Keyword patterns that suggest blocking */
function containsBlockerKeywords(text) {
  const lower = text.toLowerCase()
  const patterns = [
    'מחכה ל', 'ממתין ל', 'חסום', 'תלוי ב', 'צריך ש', 'אין לי',
    'waiting', 'blocked', 'depends on', 'need to', "can't", 'cannot',
  ]
  return patterns.some(p => lower.includes(p))
}

// ─── Classification ─────────────────────────────────────────────────────────

/**
 * Classify the reason a task is stuck, with a suggested next action.
 *
 * @param {object} task
 * @returns {{
 *   reason: 'unclear'|'blocked'|'waiting'|'overwhelmed'|'fear'|'low-priority',
 *   label: string,
 *   description: string,
 *   suggestion: string,
 *   icon: string,
 * }}
 */
export function classifyStuck(task) {
  // 1. Explicit blocker field
  if (task.blocker && task.blocker.trim()) {
    return {
      reason: 'blocked',
      label: 'חסום',
      description: `חסום על ידי: ${task.blocker}`,
      suggestion: 'הסר את החסם או שנה את הגישה',
      icon: '🚧',
    }
  }

  // 2. Waiting keywords in notes
  if (containsWaitingKeywords(task.notes || '')) {
    return {
      reason: 'waiting',
      label: 'ממתין',
      description: 'המשימה תלויה במישהו אחר',
      suggestion: 'שלח תזכורת או קבע דדליין ברור',
      icon: '⏳',
    }
  }

  // 3. Unclear — vague title with no description
  const isUnclear =
    (!task.description || task.description.length < 15) &&
    (!task.notes || task.notes.length < 20) &&
    (task.title.split(' ').length <= 3)

  if (isUnclear) {
    return {
      reason: 'unclear',
      label: 'לא ברור',
      description: 'המשימה לא מוגדרת מספיק',
      suggestion: 'הגדר מה בדיוק צריך לקרות כדי שזה יסתיים',
      icon: '❓',
    }
  }

  // 4. Overwhelmed — huge task with no subtasks
  const effort = task.estimatedMinutes || task.effortMinutes || 0
  const hasSubtasks = (task.subtasks || []).length > 0
  if (effort >= 120 && !hasSubtasks) {
    return {
      reason: 'overwhelmed',
      label: 'מוצף',
      description: 'המשימה גדולה מדי בלי פירוק',
      suggestion: 'פרק ל-3 צעדים ראשונים ספציפיים',
      icon: '🌊',
    }
  }

  // 5. Fear / avoidance — high resistance + multiple touches
  const touches = task.touchCount || task.postponedCount || 0
  const resistance = task.resistanceLevel || 1
  if (touches >= 3 || resistance >= 4) {
    return {
      reason: 'fear',
      label: 'התנגדות',
      description: `נדחתה ${touches === 1 ? 'פעם אחת' : `${touches} פעמים`} — יש כאן חסם רגשי`,
      suggestion: 'מה הגרוע שיכול לקרות אם תתחיל? התחל עם 5 דקות בלבד',
      icon: '😬',
    }
  }

  // 6. Low priority / misplaced
  return {
    reason: 'low-priority',
    label: 'לא דחוף',
    description: 'המשימה נמצאת ב-Today אבל אינה עדיפות גבוהה',
    suggestion: 'העבר לשבוע או לbacklog — פנה מקום למה שחשוב',
    icon: '📉',
  }
}

function containsWaitingKeywords(text) {
  const lower = text.toLowerCase()
  const patterns = [
    'מחכה ל', 'ממתין ל', 'waiting for', 'waiting on', 'pending', 'תלוי ב',
  ]
  return patterns.some(p => lower.includes(p))
}

// ─── Bulk scan ───────────────────────────────────────────────────────────────

/**
 * Returns all stuck tasks with their classification.
 * @param {object[]} tasks
 * @returns {{ task: object, signal: object }[]}
 */
export function findAllStuck(tasks) {
  return tasks
    .filter(t => detectStuck(t))
    .map(t => ({ task: t, signal: classifyStuck(t) }))
}

/**
 * Hours a task has been in its current active status.
 * @param {object} task
 * @returns {number}
 */
export function hoursInStatus(task) {
  const anchor = task.doingStartedAt || task.movedToTodayAt || task.updatedAt
  if (!anchor) return 0
  return (Date.now() - new Date(anchor).getTime()) / HOUR
}
