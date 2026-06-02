/**
 * FlowOS Execution Event Schema
 *
 * Defines the complete type system for execution events:
 *   - FlowExecutionEvent       — single immutable event in the timeline
 *   - FounderExecutionState    — in-memory state rebuilt by replay
 *   - WeeklyExecutionSnapshot  — persisted on week_closed
 *   - NivosExecutionState      — AI-ready coaching signal
 *
 * All schemas are validated at runtime with Zod.
 * Schema version: 1 — bump EXECUTION_SCHEMA_V when payload shape changes.
 *
 * Replay contract:
 *   FounderExecutionState = replayExecutionEvents(events.sort(occurred_at ASC))
 *
 * Append-only guarantee:
 *   Events are never mutated or deleted. The timeline is the source of truth.
 */

import { z } from 'zod'

// ─── Schema version ───────────────────────────────────────────────────────────

export const EXECUTION_SCHEMA_V = 1

// ─── Event type enum ──────────────────────────────────────────────────────────

export const EXECUTION_EVENT_TYPES = /** @type {const} */ ({
  TASK_CREATED:   'task_created',
  TASK_UPDATED:   'task_updated',
  TASK_MOVED:     'task_moved',
  TASK_COMPLETED: 'task_completed',
  TASK_DELETED:   'task_deleted',
  TASK_REOPENED:  'task_reopened',
  BIG3_SET:       'big3_set',
  WEEK_CLOSED:    'week_closed',
})

export const ExecutionEventTypeSchema = z.enum([
  'task_created',
  'task_updated',
  'task_moved',
  'task_completed',
  'task_deleted',
  'task_reopened',
  'big3_set',
  'week_closed',
])

// ─── Task status enum ─────────────────────────────────────────────────────────

export const TaskStatusSchema = z.enum([
  'backlog', 'week', 'today', 'doing', 'done',
])

// ─── Per-event payload schemas ────────────────────────────────────────────────

/** Minimal task snapshot included in most event payloads. */
const TaskSnapshotSchema = z.object({
  task_id:      z.string(),
  title:        z.string(),
  status:       TaskStatusSchema.optional(),
  priority:     z.enum(['low', 'medium', 'high', 'critical']).optional(),
  is_big_three: z.boolean().optional(),
  goal_ref:     z.string().nullable().optional(),
  goal_type:    z.enum(['quarterly', 'monthly', 'none']).nullable().optional(),
  energy_level: z.enum(['deep', 'quick']).nullable().optional(),
  touch_count:  z.number().int().nonnegative().optional(),
})

export const PayloadSchemas = {
  task_created: TaskSnapshotSchema.extend({
    owner:  z.enum(['trainee', 'coach']).optional(),
    source: z.enum(['manual', 'synced', 'goal']).optional(),
  }),

  task_updated: TaskSnapshotSchema.extend({
    changed_fields: z.array(z.string()).optional(),
    prev_title:     z.string().optional(),
    prev_priority:  z.string().optional(),
  }),

  task_moved: TaskSnapshotSchema.extend({
    from_status: TaskStatusSchema,
    to_status:   TaskStatusSchema,
    is_deferral: z.boolean(),   // moved away from today/doing without completing
  }),

  task_completed: TaskSnapshotSchema.extend({
    completed_at:    z.string(),          // ISO string
    doing_started_at: z.string().nullable().optional(),
    actual_minutes:  z.number().nullable().optional(),
    was_big_three:   z.boolean().optional(),
  }),

  task_deleted: z.object({
    task_id:  z.string(),
    title:    z.string(),
    status:   TaskStatusSchema.optional(),
    week_id:  z.string().nullable().optional(),
  }),

  task_reopened: TaskSnapshotSchema.extend({
    prev_completed_at: z.string().nullable().optional(),
    reason:            z.string().optional(),
  }),

  big3_set: z.object({
    task_id:      z.string(),
    title:        z.string(),
    is_big_three: z.boolean(),
    week_id:      z.string(),
  }),

  week_closed: z.object({
    week_id:           z.string(),
    closed_at:         z.string(),        // ISO string
    completed_count:   z.number().int().nonnegative(),
    total_tasks:       z.number().int().nonnegative(),
    big3_done:         z.number().int().min(0).max(3),
    big3_total:        z.number().int().min(0).max(3),
    decisions:         z.record(z.string(), z.enum(['next_week', 'backlog', 'delete'])),
    main_win:          z.string().optional(),
    what_worked:       z.string().optional(),
    what_change:       z.string().optional(),
  }),
}

// ─── FlowExecutionEvent ───────────────────────────────────────────────────────

/**
 * @typedef {Object} FlowExecutionEvent
 * @property {string}  id           - Client UUID (dedup key together with user_email)
 * @property {number}  schema_v     - Schema version (currently 1)
 * @property {string}  type         - ExecutionEventType
 * @property {string}  user_email   - Coach/trainee email (partition key)
 * @property {number}  occurred_at  - Epoch ms (client clock — authoritative for ordering)
 * @property {string|null} week_id  - e.g. 'week-2026-05-28', null for non-week events
 * @property {string|null} task_id  - null for week_closed / big3 bulk ops
 * @property {Object}  payload      - Event-specific validated payload
 */
export const FlowExecutionEventSchema = z.object({
  id:          z.string().min(1),
  schema_v:    z.literal(1),
  type:        ExecutionEventTypeSchema,
  user_email:  z.string().email(),
  occurred_at: z.number().int().positive(),
  week_id:     z.string().nullable(),
  task_id:     z.string().nullable(),
  payload:     z.record(z.string(), z.unknown()),
})

// ─── FounderExecutionState ────────────────────────────────────────────────────

/**
 * @typedef {Object} TaskState
 * @property {string}  id
 * @property {string}  title
 * @property {string}  status
 * @property {boolean} isBigThree
 * @property {string|null} goalRef
 * @property {string|null} goalType
 * @property {string|null} priority
 * @property {number}  touchCount
 * @property {string|null} completedAt
 * @property {string|null} deletedAt
 * @property {string[]} statusHistory   - ['backlog','week','today','doing','done']
 */
const TaskStateSchema = z.object({
  id:             z.string(),
  title:          z.string(),
  status:         TaskStatusSchema,
  isBigThree:     z.boolean(),
  goalRef:        z.string().nullable(),
  goalType:       z.string().nullable(),
  priority:       z.string().nullable(),
  touchCount:     z.number().int().nonnegative(),
  completedAt:    z.string().nullable(),
  deletedAt:      z.string().nullable(),
  statusHistory:  z.array(z.string()),
})

/**
 * @typedef {Object} FounderExecutionState
 * @property {number}   schema_v
 * @property {Object.<string, TaskState>}  tasks        - keyed by task_id
 * @property {string[]} big3             - task IDs currently marked Big3
 * @property {string|null} currentWeekId
 * @property {string[]} closedWeekIds
 * @property {number}   lastEventTs      - occurred_at of last applied event
 * @property {number}   eventCount       - total events replayed
 */
export const FounderExecutionStateSchema = z.object({
  schema_v:       z.literal(1),
  tasks:          z.record(z.string(), TaskStateSchema),
  big3:           z.array(z.string()),
  currentWeekId:  z.string().nullable(),
  closedWeekIds:  z.array(z.string()),
  lastEventTs:    z.number(),
  eventCount:     z.number().int().nonnegative(),
})

/** Empty initial state for replay. */
export function emptyFounderExecutionState() {
  return /** @type {import('zod').infer<typeof FounderExecutionStateSchema>} */ ({
    schema_v:      1,
    tasks:         {},
    big3:          [],
    currentWeekId: null,
    closedWeekIds: [],
    lastEventTs:   0,
    eventCount:    0,
  })
}

// ─── WeeklyExecutionSnapshot ─────────────────────────────────────────────────

/**
 * @typedef {Object} WeeklyExecutionSnapshot
 * Written on week_closed. Enables fast week-level queries without full replay.
 *
 * @property {number}   schema_v
 * @property {string}   weekId
 * @property {string}   closedAt        - ISO string
 * @property {string[]} completedTaskIds
 * @property {string[]} deletedTaskIds
 * @property {string[]} deferredTaskIds - tasks moved back from today/doing
 * @property {number}   big3Done        - 0-3
 * @property {number}   big3Total       - 0-3
 * @property {number}   totalTasks
 * @property {number}   completionRate  - 0-1
 * @property {Object}   decisions       - {taskId: 'next_week'|'backlog'|'delete'}
 * @property {string}   mainWin
 * @property {number}   deferrals       - count of deferral events this week
 */
export const WeeklyExecutionSnapshotSchema = z.object({
  schema_v:         z.literal(1),
  weekId:           z.string(),
  closedAt:         z.string(),
  completedTaskIds: z.array(z.string()),
  deletedTaskIds:   z.array(z.string()),
  deferredTaskIds:  z.array(z.string()),
  big3Done:         z.number().int().min(0).max(3),
  big3Total:        z.number().int().min(0).max(3),
  totalTasks:       z.number().int().nonnegative(),
  completionRate:   z.number().min(0).max(1),
  decisions:        z.record(z.string(), z.enum(['next_week', 'backlog', 'delete'])),
  mainWin:          z.string(),
  deferrals:        z.number().int().nonnegative(),
})

// ─── NivosExecutionState ──────────────────────────────────────────────────────

/**
 * @typedef {Object} NivosExecutionState
 * AI-ready coaching signal derived from FounderExecutionState + recent history.
 * Computed on demand, never stored — always derived from replay.
 *
 * @property {number}   schema_v
 * @property {number}   generatedAt         - epoch ms
 * @property {string}   userEmail
 * @property {string|null} currentWeekId
 * @property {number}   completionRate7d    - 0-1 (% tasks completed in last 7 days)
 * @property {number}   big3CompletionRate  - 0-1 (% of Big3 tasks completed this week)
 * @property {number}   avgDeferralsPerTask - avg touchCount across active tasks
 * @property {string[]} mostDeferredTaskIds - top 3 by touchCount
 * @property {string[]} stuckTaskIds        - in today/doing with no completion
 * @property {'improving'|'declining'|'stable'} trend
 * @property {number}   completedLast7d     - raw count
 * @property {number}   completedPrior7d    - for trend comparison
 * @property {string[]} recentWins          - last 3 completed task titles
 */
export const NivosExecutionStateSchema = z.object({
  schema_v:            z.literal(1),
  generatedAt:         z.number().int().positive(),
  userEmail:           z.string(),
  currentWeekId:       z.string().nullable(),
  completionRate7d:    z.number().min(0).max(1),
  big3CompletionRate:  z.number().min(0).max(1),
  avgDeferralsPerTask: z.number().nonnegative(),
  mostDeferredTaskIds: z.array(z.string()),
  stuckTaskIds:        z.array(z.string()),
  trend:               z.enum(['improving', 'declining', 'stable']),
  completedLast7d:     z.number().int().nonnegative(),
  completedPrior7d:    z.number().int().nonnegative(),
  recentWins:          z.array(z.string()),
})

// ─── Event factory ────────────────────────────────────────────────────────────

/**
 * Create a validated FlowExecutionEvent.
 * Throws if payload fails Zod validation.
 *
 * @param {string} type
 * @param {Object} payload
 * @param {string} userEmail
 * @param {Object} [opts]
 * @param {string|null} [opts.weekId]
 * @param {string|null} [opts.taskId]
 * @returns {import('zod').infer<typeof FlowExecutionEventSchema>}
 */
export function makeExecutionEvent(type, payload, userEmail, opts = {}) {
  // Validate payload against the per-type schema
  const payloadSchema = PayloadSchemas[type]
  if (payloadSchema) {
    const result = payloadSchema.safeParse(payload)
    if (!result.success) {
      console.warn(`[FlowOS:execSchema] payload validation failed for ${type}:`, result.error.flatten())
      // Don't throw — emit with raw payload, never block UI
    }
  }

  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

  return /** @type {import('zod').infer<typeof FlowExecutionEventSchema>} */ ({
    id,
    schema_v:    EXECUTION_SCHEMA_V,
    type,
    user_email:  userEmail,
    occurred_at: Date.now(),
    week_id:     opts.weekId ?? null,
    task_id:     opts.taskId ?? null,
    payload,
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derive week_id string from a Date or epoch ms.
 * Format: 'week-YYYY-MM-DD' anchored to Monday of that week.
 * @param {Date|number} [date]
 * @returns {string}
 */
export function getWeekId(date) {
  const d = date instanceof Date ? date : new Date(date ?? Date.now())
  // Adjust to Monday
  const day = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = (day === 0) ? -6 : 1 - day   // shift to Monday
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  const iso = monday.toISOString().slice(0, 10)
  return `week-${iso}`
}

/**
 * Validate a raw object as FlowExecutionEvent.
 * Returns { ok, event, error }.
 */
export function validateExecutionEvent(raw) {
  const result = FlowExecutionEventSchema.safeParse(raw)
  return result.success
    ? { ok: true, event: result.data, error: null }
    : { ok: false, event: null, error: result.error.flatten() }
}
