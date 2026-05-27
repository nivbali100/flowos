/**
 * Noise Detector — finds tasks that are cluttering the system
 * and generating cognitive load without producing value.
 *
 * 5 noise types:
 *   no-goal          — active tasks with no goalRef (and not Big 3)
 *   stale-backlog    — backlog tasks untouched for 30+ days
 *   stale-today      — tasks in "today" for 3+ consecutive days
 *   high-avoidance   — deferred 4+ times, never started
 *   low-impact-active — low priority/impact tasks consuming today slots
 */

const DAY = 24 * 60 * 60 * 1000

// ─── Individual detectors ────────────────────────────────────────────────────

function isNoGoal(task) {
  return (
    ['today', 'week', 'doing'].includes(task.status) &&
    !task.goalRef &&
    !task.isBigThree
  )
}

function isStaleBacklog(task) {
  if (task.status !== 'backlog') return false
  const anchor = task.updatedAt || task.createdAt
  if (!anchor) return false
  const daysSince = (Date.now() - new Date(anchor).getTime()) / DAY
  return daysSince > 30
}

function isStaleTodayMultipleDays(task) {
  if (task.status !== 'today') return false
  const anchor = task.movedToTodayAt || task.updatedAt
  if (!anchor) return false
  const daysSince = (Date.now() - new Date(anchor).getTime()) / DAY
  return daysSince >= 3
}

function isHighAvoidance(task) {
  // Exclude completed and archived tasks — only flag genuinely active avoidance
  if (task.status === 'done' || task.archivedAt) return false
  const touches = task.touchCount || task.postponedCount || 0
  return touches >= 4
}

function isLowImpactActive(task) {
  if (!['today', 'doing'].includes(task.status)) return false
  const lowPriority = task.priority === 'low' || task.impactScore <= 1
  const notBig3 = !task.isBigThree
  return lowPriority && notBig3
}

// ─── Noise items ─────────────────────────────────────────────────────────────

/**
 * Scan all tasks and return noise items with suggested actions.
 *
 * @param {object[]} tasks
 * @returns {{
 *   task: object,
 *   type: string,
 *   label: string,
 *   description: string,
 *   action: string,       // suggested action label
 *   actionStatus: string, // suggested target status
 *   severity: 'high'|'medium'|'low',
 * }[]}
 */
export function detectNoise(tasks) {
  const items = []

  for (const task of tasks) {
    // Skip completed and archived tasks — they don't belong in the noise scan
    if (task.status === 'done' || task.archivedAt) continue

    if (isHighAvoidance(task)) {
      items.push({
        task,
        type: 'high-avoidance',
        label: 'נמנע ממנה',
        description: `נדחתה ${task.touchCount || task.postponedCount || 0} פעמים`,
        action: 'הכרע עכשיו',
        actionStatus: 'today',
        severity: 'high',
      })
      continue // don't double-count
    }

    if (isStaleTodayMultipleDays(task)) {
      const days = Math.floor(
        (Date.now() - new Date(task.movedToTodayAt || task.updatedAt).getTime()) / DAY
      )
      items.push({
        task,
        type: 'stale-today',
        label: 'תקועה ב-Today',
        description: `${days} ימים ב-Today ללא התקדמות`,
        action: 'החזר לשבוע',
        actionStatus: 'week',
        severity: 'high',
      })
      continue
    }

    if (isLowImpactActive(task)) {
      items.push({
        task,
        type: 'low-impact-active',
        label: 'השפעה נמוכה',
        description: 'תופסת מקום ב-Today אבל אינה מניעה קדימה',
        action: 'הורד לשבוע',
        actionStatus: 'week',
        severity: 'medium',
      })
      continue
    }

    if (isNoGoal(task)) {
      items.push({
        task,
        type: 'no-goal',
        label: 'ללא יעד',
        description: 'לא מחוברת לאף יעד',
        action: 'חבר ליעד',
        actionStatus: null, // special action — open goal linker
        severity: 'low',
      })
      continue
    }

    if (isStaleBacklog(task)) {
      const days = Math.floor(
        (Date.now() - new Date(task.updatedAt || task.createdAt).getTime()) / DAY
      )
      items.push({
        task,
        type: 'stale-backlog',
        label: 'ישנה בbacklog',
        description: `${days} ימים בלי מגע`,
        action: 'מחק',
        actionStatus: '__delete__',   // sentinel: AntiNoisePanel calls onDelete, not onMove
        severity: 'low',
      })
    }
  }

  // Sort: high → medium → low
  const ORDER = { high: 0, medium: 1, low: 2 }
  return items.sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
}

/**
 * Summary counts for the noise panel header badge.
 * @param {object[]} tasks
 * @returns {{ total: number, high: number, medium: number, low: number }}
 */
export function noiseScore(tasks) {
  const items = detectNoise(tasks)
  return {
    total: items.length,
    high:   items.filter(i => i.severity === 'high').length,
    medium: items.filter(i => i.severity === 'medium').length,
    low:    items.filter(i => i.severity === 'low').length,
  }
}
