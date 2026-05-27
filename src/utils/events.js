/**
 * FlowOS Behavioral Event System
 *
 * Append-only event log for Nivos AI integration.
 * Events are:
 *   - Durable: persisted to localStorage + synced to Supabase
 *   - Timestamped: ISO string, UTC
 *   - Versioned: schema_v field for future migrations
 *   - Serializable: plain JSON, no circular refs
 *   - Queryable: indexed by type and timestamp
 *   - Safe for replay: idempotent reads
 *
 * Storage: flowos_events (array, capped at MAX_EVENTS)
 * Supabase: flowos_events table (append-only, read by Nivos webhook)
 */

import { supabase } from '../lib/supabase.js'

const STORAGE_KEY  = 'flowos_events'
const MAX_EVENTS   = 500   // keep last 500 events locally
const SCHEMA_V     = 1

// ─── Event types ─────────────────────────────────────────────────────────────
export const EVENT_TYPES = {
  TASK_CREATED:            'task_created',
  TASK_UPDATED:            'task_updated',
  TASK_MOVED:              'task_moved',
  TASK_COMPLETED:          'task_completed',
  TASK_DEFERRED:           'task_deferred',       // moved away from today/doing without completing
  TASK_REOPENED:           'task_reopened',        // moved back from done
  TASK_ARCHIVED:           'task_archived',        // done → archived on week close
  TASK_DELETED:            'task_deleted',
  TASK_STUCK:              'task_stuck',           // in doing > STUCK_HOURS
  TASK_TOUCH:              'task_touch',           // touchCount incremented
  WEEK_CLOSED:             'week_closed',
  BIG3_SET:                'big3_set',
  BIG3_COMPLETED:          'big3_completed',       // Big3 task marked done
  FOCUS_SESSION_STARTED:   'focus_session_started',
  FOCUS_SESSION_COMPLETED: 'focus_session_completed',
  MORNING_PLAN_COMPLETED:  'morning_plan_completed',
  GOAL_UPDATED:            'goal_updated',
}

// ─── Event factory ────────────────────────────────────────────────────────────
function makeEvent(type, payload, coachEmail) {
  return {
    id:          (typeof crypto !== 'undefined' && crypto.randomUUID)
                   ? crypto.randomUUID()
                   : (Date.now().toString(36) + Math.random().toString(36).slice(2)),
    schema_v:    SCHEMA_V,
    type,
    coach_email: coachEmail || null,
    occurred_at: new Date().toISOString(),
    payload,     // task snapshot or relevant context (keep small — no subtasks array)
  }
}

// ─── Persist locally ─────────────────────────────────────────────────────────
function persistEvent(event) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const next = [event, ...existing].slice(0, MAX_EVENTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage full — events are best-effort, never block UI
  }
}

// ─── Sync to Supabase ─────────────────────────────────────────────────────────
async function syncEventToSupabase(event) {
  if (!supabase) return
  try {
    await supabase.from('flowos_events').insert({
      event_id:    event.id,
      coach_email: event.coach_email,
      type:        event.type,
      occurred_at: event.occurred_at,
      schema_v:    event.schema_v,
      payload:     event.payload,
    })
  } catch {
    // Fire-and-forget — never block UI
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Emit a behavioral event.
 * Persists locally and fire-and-forgets to Supabase.
 */
export function emitEvent(type, payload, coachEmail) {
  const event = makeEvent(type, payload, coachEmail)
  persistEvent(event)
  syncEventToSupabase(event)
  return event
}

/**
 * Emit task lifecycle events with a minimal task snapshot.
 * Strips large fields (subtasks, aiAnalysis) to keep events small.
 */
export function emitTaskEvent(type, task, extra = {}, coachEmail) {
  const payload = {
    task_id:     task.id,
    title:       task.title,
    status:      task.status,
    priority:    task.priority,
    is_big_three: task.isBigThree || false,
    goal_ref:    task.goalRef || null,
    goal_type:   task.goalType || null,
    energy_level: task.energyLevel || null,
    touch_count: task.touchCount || 0,
    doing_started_at: task.doingStartedAt || null,
    completed_at: task.completedAt || null,
    ...extra,
  }
  return emitEvent(type, payload, coachEmail)
}

/**
 * Read all local events (for debugging or export).
 */
export function getLocalEvents(limit = 100) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return all.slice(0, limit)
  } catch { return [] }
}

/**
 * Read events filtered by type.
 */
export function getEventsByType(type, limit = 50) {
  return getLocalEvents(MAX_EVENTS).filter(e => e.type === type).slice(0, limit)
}
