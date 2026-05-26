/**
 * pressure.js — execution pressure logic for FlowOS.
 *
 * computePressure(tasks)   → { type, level, title, body, taskId?, actionLabel? } | null
 * getInactivityDays(tasks) → number (days since last action)
 * getStuckTasks(tasks)     → Task[]
 * getUnlinkedActive(tasks) → Task[]
 *
 * Coach push (localStorage key: flowos_coach_push):
 *   { message, taskTitle?, sentAt, readAt }
 *   loadCoachPush / saveCoachPush / markCoachPushRead
 */

import { STUCK_HOURS } from '../constants/app.js'

const INACTIVITY_DAYS = {   // escalation thresholds
  GENTLE:  1,
  STRONG:  2,
  DIRECT:  3,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getInactivityDays(tasks) {
  // Count days since the most recent task event (completion, move-to-today, or update)
  const timestamps = tasks
    .flatMap(t => [t.completedAt, t.movedToTodayAt, t.updatedAt])
    .filter(Boolean)
    .map(d => new Date(d).getTime())
  if (!timestamps.length) return Infinity
  return Math.floor((Date.now() - Math.max(...timestamps)) / 86_400_000)
}

export function getStuckTasks(tasks) {
  return tasks.filter(t => {
    if (t.status !== 'doing' || !t.updatedAt) return false
    return (Date.now() - new Date(t.updatedAt).getTime()) / 3_600_000 > STUCK_HOURS
  })
}

export function getUnlinkedActive(tasks) {
  return tasks.filter(t => !t.goalRef && t.status !== 'done')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Returns a single pressure object (highest priority) or null if no pressure.
 * level 3 = direct/red, level 2 = strong/red, level 1 = gentle/amber
 */
export function computePressure(tasks) {
  if (!tasks.length) return null

  const done      = tasks.filter(t => t.status === 'done')
  const total     = tasks.length
  const pct       = total > 0 ? Math.round((done.length / total) * 100) : 0
  const openBig3  = tasks.filter(t => t.isBigThree && t.status !== 'done')
  const stuck     = getStuckTasks(tasks)
  const unlinked  = getUnlinkedActive(tasks)
  const days      = getInactivityDays(tasks)

  // ── P1: Task stuck in "doing" ────────────────────────────────────────────────
  if (stuck.length > 0) return {
    type:        'stuck',
    level:       2,
    title:       '⚠ משימה תקועה',
    body:        `"${stuck[0].title}" — או סוגרים עכשיו, או מפרקים לצעדים קטנים`,
    taskId:      stuck[0].id,
    actionLabel: 'סגור אותה',
  }

  // ── P2: Escalation — 3+ days no progress ────────────────────────────────────
  if (days >= INACTIVITY_DAYS.DIRECT && openBig3.length > 0) return {
    type:  'escalation',
    level: 3,
    title: '🚨 3 ימים ללא התקדמות',
    body:  'אתה נמנע — תבחר: לסגור או לבטל. אי-החלטה היא החלטה.',
  }

  // ── P3: Escalation — 2 days, behind ─────────────────────────────────────────
  if (days >= INACTIVITY_DAYS.STRONG && (openBig3.length > 0 || pct < 30)) return {
    type:  'escalation',
    level: 2,
    title: '⚠ יומיים בלי התקדמות',
    body:  'הזמן לזוז. בחר משימה אחת וסיים אותה לפני הכל.',
  }

  // ── P4: Behind (<50%) with open Big 3 ───────────────────────────────────────
  if (pct < 50 && openBig3.length > 0) return {
    type:        'behind',
    level:       2,
    title:       '🔴 אתה מאחור השבוע',
    body:        `סגור את "${openBig3[0].title}" עכשיו — זה הדבר שמזיז הכל`,
    taskId:      openBig3[0].id,
    actionLabel: 'להיום',
  }

  // ── P5: Too many unlinked tasks (noise) ──────────────────────────────────────
  if (unlinked.length >= 5) return {
    type:  'unlinked',
    level: 1,
    title: '📋 יש רעש בלוח',
    body:  `${unlinked.length} משימות פתוחות ללא יעד — הרעש מונע ביצוע`,
  }

  // ── P6: Day 1 — gentle nudge with open Big 3 ─────────────────────────────────
  if (days >= INACTIVITY_DAYS.GENTLE && openBig3.length > 0) return {
    type:  'nudge',
    level: 1,
    title: '📌 Big 3 מחכה',
    body:  'יום עבר — מה אחד דבר שאפשר לסגור עכשיו?',
  }

  return null
}

// ─── Coach Push ───────────────────────────────────────────────────────────────
// Stored as a single object (last push wins). Coach writes, Trainee reads.

export function loadCoachPush() {
  try { return JSON.parse(localStorage.getItem('flowos_coach_push') || 'null') } catch { return null }
}

export function saveCoachPush({ message, taskTitle = '' }) {
  try {
    localStorage.setItem('flowos_coach_push', JSON.stringify({
      message,
      taskTitle,
      sentAt:  new Date().toISOString(),
      readAt:  null,
    }))
  } catch {}
}

export function markCoachPushRead() {
  try {
    const p = loadCoachPush()
    if (p && !p.readAt) {
      localStorage.setItem('flowos_coach_push', JSON.stringify({ ...p, readAt: new Date().toISOString() }))
    }
  } catch {}
}
