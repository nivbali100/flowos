/**
 * FlowExecutionEvent — canonical event contract for FlowOS.
 *
 * Schema guarantees:
 *   - schema_version: locked literal, enables future migrations
 *   - sequence: monotonic per-session counter for ordered replay
 *   - session_id: stable per page-load UUID, groups events per session
 *   - idempotency_key: `${session_id}:${sequence}` — globally unique per event
 *   - Zod validation: all events validated at creation; violations warn but never throw
 *
 * Replay safety:
 *   - Supabase UNIQUE(coach_email, idempotency_key) prevents duplicate rows on replay
 *   - sequence ordering allows deterministic rebuild of state from event log
 *   - schema_version allows consumers to handle legacy events differently
 */

import { z } from 'zod'

// ─── Constants ────────────────────────────────────────────────────────────────
export const SCHEMA_VERSION = '1'

// Stable per page-load session identifier
export const SESSION_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`

// Monotonic sequence counter — resets per page load (that's fine: idempotency_key is globally unique)
let _seq = 0
export function nextSeq() { return ++_seq }

// ─── Event types ──────────────────────────────────────────────────────────────
export const EventTypeEnum = z.enum([
  'task_created',
  'task_updated',
  'task_moved',
  'task_completed',
  'task_deleted',
  'task_reopened',
  'task_deferred',
  'task_archived',
  'task_stuck',
  'task_touch',
  'big3_set',
  'big3_completed',
  'week_closed',
  'focus_session_started',
  'focus_session_completed',
  'morning_plan_completed',
  'goal_updated',
])

export const EVENT_TYPES = /** @type {Record<string,string>} */ (
  Object.fromEntries(EventTypeEnum.options.map(v => [v.toUpperCase(), v]))
)

// ─── Payload schemas (per event type, open-ended via passthrough) ─────────────

const TaskPayload = z.object({
  task_id:          z.string(),
  title:            z.string().optional(),
  status:           z.string().optional(),
  priority:         z.string().optional(),
  is_big_three:     z.boolean().optional(),
  goal_ref:         z.string().nullable().optional(),
  goal_type:        z.string().nullable().optional(),
  energy_level:     z.string().nullable().optional(),
  touch_count:      z.number().optional(),
  doing_started_at: z.string().nullable().optional(),
  completed_at:     z.string().nullable().optional(),
}).passthrough()

const WeekPayload = z.object({
  week_id:          z.string(),
  decisions_count:  z.number().optional(),
}).passthrough()

const GenericPayload = z.record(z.unknown())

// Discriminated union — fallback to GenericPayload for unknown types
function payloadSchema(type) {
  if (['task_created','task_updated','task_moved','task_completed',
       'task_deleted','task_reopened','task_deferred','task_archived',
       'task_stuck','task_touch','big3_set','big3_completed',
       'focus_session_started','focus_session_completed'].includes(type)) {
    return TaskPayload
  }
  if (type === 'week_closed') return WeekPayload
  return GenericPayload
}

// ─── Root event schema ────────────────────────────────────────────────────────
export const FlowExecutionEventSchema = z.object({
  id:               z.string().uuid(),
  schema_version:   z.literal(SCHEMA_VERSION),
  type:             EventTypeEnum,
  coach_email:      z.string().nullable(),
  payload:          GenericPayload,
  occurred_at:      z.string().datetime({ offset: true }),
  sequence:         z.number().int().positive(),
  session_id:       z.string().uuid(),
  idempotency_key:  z.string().min(1),
})

// ─── Factory ──────────────────────────────────────────────────────────────────
/**
 * Create a validated FlowExecutionEvent.
 * Never throws — logs a console.warn on schema violations but always returns the event.
 *
 * @param {string} type         - one of EventTypeEnum values
 * @param {object} payload      - event-specific data (task snapshot, etc.)
 * @param {string|null} email   - coach email (coach_email in DB)
 * @returns {object}            - validated (or best-effort) event object
 */
export function createEvent(type, payload, email) {
  const seq  = nextSeq()
  const id   = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`

  const event = {
    id,
    schema_version:  SCHEMA_VERSION,
    type,
    coach_email:     email || null,
    payload:         payload || {},
    occurred_at:     new Date().toISOString(),
    sequence:        seq,
    session_id:      SESSION_ID,
    idempotency_key: `${SESSION_ID}:${seq}`,
  }

  // Validate payload shape for known types
  const pSchema = payloadSchema(type)
  const pResult = pSchema.safeParse(payload)
  if (!pResult.success) {
    console.warn('[FlowOS:contract] Payload schema warning for', type, pResult.error.issues)
  }

  // Validate full event shape
  const result = FlowExecutionEventSchema.safeParse(event)
  if (!result.success) {
    console.warn('[FlowOS:contract] Event schema violation:', result.error.issues)
  }

  return event
}
