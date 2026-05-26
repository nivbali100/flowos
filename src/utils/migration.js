/**
 * FlowOS Data Migration — v1 → v2
 *
 * Runs once on app startup. Adds new fields to existing tasks without
 * touching data that's already valid. Safe to re-run (idempotent after flag set).
 *
 * v2 new task fields:
 *   impactScore    (1-5)  — mapped from priority
 *   urgencyScore   (1-5)  — derived from status + deadline
 *   resistanceLevel (1-5) — default 2 (unknown → assume medium-low)
 *   clarityLevel   (1-5)  — inferred from description/notes length
 *   touchCount     (int)  — mapped from postponedCount or 0
 *   subtasks       ([])   — empty array default
 *   completionDefinition  — null
 *   blocker        — null
 *   effortMinutes  — mapped from estimatedMinutes
 */

const MIGRATION_KEY = 'flowos_migrated_v2'
const TASKS_KEY     = 'flowos_tasks'

// ─── Field mappings ──────────────────────────────────────────────────────────

const PRIORITY_TO_IMPACT = {
  critical: 5,
  high:     4,
  medium:   3,
  low:      2,
}

const STATUS_TO_URGENCY = {
  doing:   5,
  today:   4,
  week:    3,
  backlog: 2,
  icebox:  1,
}

/**
 * Infer clarityLevel from available data.
 * 1 = almost no info, 5 = fully specified
 */
function inferClarity(task) {
  let score = 1
  if (task.title && task.title.split(' ').length > 3) score++
  if (task.description && task.description.length > 30) score++
  if (task.notes && task.notes.length > 20) score++
  if (task.estimatedMinutes && task.estimatedMinutes > 0) score++
  return Math.min(5, score)
}

/**
 * Migrate a single task object from v1 to v2.
 * Preserves all existing fields; only adds missing ones.
 * @param {object} task
 * @returns {object}
 */
export function migrateTask(task) {
  // Already migrated (has v2 signature field)
  if (task._v2) return task

  return {
    ...task,

    // ── New scoring fields ──────────────────────────────────────────────────
    impactScore: task.impactScore ||
      PRIORITY_TO_IMPACT[task.priority] || 3,

    urgencyScore: task.urgencyScore ||
      STATUS_TO_URGENCY[task.status] || 2,

    resistanceLevel: task.resistanceLevel || 2,  // unknown = medium-low

    clarityLevel: task.clarityLevel || inferClarity(task),

    // ── Effort / time tracking ──────────────────────────────────────────────
    effortMinutes: task.effortMinutes || task.estimatedMinutes || null,

    // ── Behavioral tracking ─────────────────────────────────────────────────
    touchCount: task.touchCount || task.postponedCount || 0,

    // ── Structure ───────────────────────────────────────────────────────────
    subtasks: task.subtasks || [],
    completionDefinition: task.completionDefinition || null,
    blocker: task.blocker || null,

    // ── Outcome type (forward compat) ────────────────────────────────────────
    outcomeType: task.outcomeType || mapTypeToOutcome(task.type),

    // ── Migration stamp ─────────────────────────────────────────────────────
    _v2: true,
  }
}

/**
 * Map legacy task.type → outcomeType.
 */
function mapTypeToOutcome(type) {
  const MAP = {
    strategy:   'growth',
    sales:      'money',
    marketing:  'content',
    content:    'content',
    operations: 'system',
    finance:    'money',
    mindset:    'personal',
    personal:   'personal',
  }
  return MAP[type] || 'growth'
}

// ─── Bulk migration ──────────────────────────────────────────────────────────

/**
 * Run the v1→v2 migration on all tasks in localStorage.
 * Idempotent — will not re-run if already done.
 * Call this once at app startup (before useStore initialises).
 */
export function runMigration() {
  // Already done
  if (localStorage.getItem(MIGRATION_KEY) === '1') return

  try {
    const raw = localStorage.getItem(TASKS_KEY)
    if (!raw) {
      // No tasks yet — mark as done so we don't run on next boot
      localStorage.setItem(MIGRATION_KEY, '1')
      return
    }

    const tasks = JSON.parse(raw)
    if (!Array.isArray(tasks)) {
      localStorage.setItem(MIGRATION_KEY, '1')
      return
    }

    const migrated = tasks.map(migrateTask)
    localStorage.setItem(TASKS_KEY, JSON.stringify(migrated))
    localStorage.setItem(MIGRATION_KEY, '1')

    console.info(`[FlowOS] Migrated ${migrated.length} tasks to v2 schema`)
  } catch (e) {
    console.warn('[FlowOS] Migration failed — will retry next boot', e)
    // Don't set flag so we retry
  }
}

/**
 * Force-reset the migration flag (for dev/testing).
 * Call from browser console: `import('/src/utils/migration.js').then(m => m.resetMigration())`
 */
export function resetMigration() {
  localStorage.removeItem(MIGRATION_KEY)
  console.info('[FlowOS] Migration flag cleared — will re-run on next startup')
}
