/**
 * FlowOS Behavioral Event System
 *
 * Append-only event log for Nivos AI integration.
 * Events are:
 *   - Durable: IndexedDB queue → Supabase + localStorage copy
 *   - Ordered: sequence field (monotonic per session)
 *   - Versioned: schema_version for future migrations
 *   - Validated: Zod schema on every createEvent() call
 *   - Deduplicated: idempotency_key prevents double-inserts on replay
 *   - Offline-safe: IndexedDB queue flushes on reconnect
 *   - Replay-safe: idempotent reads, UNIQUE constraint in Supabase
 *
 * Storage:
 *   - IndexedDB:  flowos_event_queue / pending (survives page close)
 *   - localStorage: flowos_events (capped at MAX_EVENTS, for local reads)
 *   - Supabase:   flowos_events table (append-only, read by Nivos webhook)
 */

import { createEvent, EVENT_TYPES as _CONTRACT_TYPES } from '../lib/events/contract.js'
import { enqueueEvent } from '../lib/events/queue.js'

// Re-export from contract so callers don't need to change imports
export { EVENT_TYPES } from '../lib/events/contract.js'

const STORAGE_KEY = 'flowos_events'
const MAX_EVENTS  = 500

// ─── Local (localStorage) persistence ────────────────────────────────────────
function persistLocal(event) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const next = [event, ...existing].slice(0, MAX_EVENTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage full — best-effort, never block UI
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Emit a behavioral event.
 *
 * Flow:
 *   1. createEvent() — validates schema, assigns sequence + idempotency_key
 *   2. persistLocal() — append to localStorage (capped, for local reads)
 *   3. enqueueEvent() — write to IndexedDB, then try Supabase immediately
 *                       (if offline: stays in IDB, flushes on reconnect)
 *
 * @param {string} type        - event type (use EVENT_TYPES constants)
 * @param {object} payload     - event-specific data
 * @param {string|null} email  - coach email
 * @returns {object}           - the created event
 */
export function emitEvent(type, payload, email) {
  const event = createEvent(type, payload, email)
  persistLocal(event)
  enqueueEvent(event).catch(() => {})
  return event
}

/**
 * Emit a task lifecycle event with a minimal task snapshot.
 * Strips large fields (subtasks) to keep events small.
 *
 * @param {string} type        - event type
 * @param {object} task        - task object from store
 * @param {object} extra       - additional payload fields (e.g. { to_status })
 * @param {string|null} email  - coach email
 * @returns {object}           - the created event
 */
export function emitTaskEvent(type, task, extra = {}, email) {
  const payload = {
    task_id:          task.id,
    title:            task.title,
    status:           task.status,
    priority:         task.priority,
    is_big_three:     task.isBigThree || false,
    goal_ref:         task.goalRef    || null,
    goal_type:        task.goalType   || null,
    energy_level:     task.energyLevel || null,
    touch_count:      task.touchCount  || 0,
    doing_started_at: task.doingStartedAt || null,
    completed_at:     task.completedAt    || null,
    ...extra,
  }
  return emitEvent(type, payload, email)
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

/**
 * Read all locally-cached events (localStorage, newest first).
 * @param {number} limit
 */
export function getLocalEvents(limit = 100) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return all.slice(0, limit)
  } catch { return [] }
}

/**
 * Read locally-cached events filtered by type.
 * @param {string} type
 * @param {number} limit
 */
export function getEventsByType(type, limit = 50) {
  return getLocalEvents(MAX_EVENTS).filter(e => e.type === type).slice(0, limit)
}
