/**
 * FlowOS Execution Event Sync Service
 *
 * Persists FlowExecutionEvents to the Supabase `execution_events` table.
 *
 * Guarantees:
 *   - Dedup-safe:    INSERT ... ON CONFLICT DO NOTHING (PK = user_email + id)
 *   - Offline-safe:  failed writes → offline queue in localStorage
 *   - Retry-safe:    queue replayed on reconnect / next flush call
 *   - Replay-safe:   fetchExecutionTimeline returns events ordered by occurred_at ASC
 *   - Append-only:   no UPDATE / DELETE ever called
 *
 * Architecture:
 *   logExecutionEvent (store) → enqueueExecutionEvent
 *     → [online]  syncNow → Supabase
 *     → [offline] queue  → flushExecutionQueue on reconnect
 *
 * Queue storage key: 'flowos:exec-queue'
 * Cursor storage key: 'flowos:exec-cursor'
 */

import { supabase, IS_NOAUTH_MODE } from '../lib/supabase.js'
import { FlowExecutionEventSchema } from '../domain/executionSchema.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const QUEUE_KEY  = 'flowos:exec-queue'
const CURSOR_KEY = 'flowos:exec-cursor'
const BATCH_SIZE = 50
const ROW_VERSION = 1

// ─── Queue helpers ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ExecQueueEntry
 * @property {import('../domain/executionSchema.js').FlowExecutionEvent} event
 * @property {number} enqueuedAt   - epoch ms
 * @property {number} retries
 */

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(entries) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(entries))
  } catch {
    // Quota exceeded — trim to last 200 and retry
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(entries.slice(-200)))
    } catch { /* give up */ }
  }
}

function setCursor(ts) {
  try { localStorage.setItem(CURSOR_KEY, String(ts)) } catch { /* non-critical */ }
}

export function getCursor() {
  try {
    const raw = localStorage.getItem(CURSOR_KEY)
    return raw ? Number(raw) : 0
  } catch { return 0 }
}

// ─── Row mapping ──────────────────────────────────────────────────────────────

/**
 * Map a QueueEntry to the execution_events DB row shape.
 * @param {ExecQueueEntry} entry
 */
function toRow(entry) {
  const { event } = entry
  return {
    id:          event.id,
    user_email:  event.user_email,
    type:        event.type,
    occurred_at: event.occurred_at,
    week_id:     event.week_id   ?? null,
    task_id:     event.task_id   ?? null,
    payload:     event.payload   ?? {},
    schema_v:    ROW_VERSION,
  }
}

// ─── Core sync operations ─────────────────────────────────────────────────────

/**
 * Sync a single entry immediately to Supabase.
 * Returns true on success, false on any error.
 * @param {ExecQueueEntry} entry
 * @returns {Promise<boolean>}
 */
async function syncSingle(entry) {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('execution_events')
      .insert([toRow(entry)])
    // 23505 = unique_violation: event already in DB (duplicate retry).
    // Treat as success — the row is there, the queue entry can be cleared.
    // Do NOT use upsert/onConflict — PostgREST ON CONFLICT paths require a
    // SELECT policy for the anon role to check the conflicting row, which
    // we intentionally withheld for security. Plain INSERT avoids that check.
    if (error?.code === '23505') return true
    return !error
  } catch {
    return false
  }
}

/**
 * Enqueue a single execution event for sync.
 *
 * If online → attempts immediate sync; falls back to queue on failure.
 * If offline → queues immediately.
 *
 * Never throws, never blocks the UI.
 *
 * @param {import('../domain/executionSchema.js').FlowExecutionEvent} event
 * @returns {Promise<void>}
 */
export async function enqueueExecutionEvent(event) {
  if (!supabase) {
    // Noauth mode: persistence disabled. This is NOT a silent no-op —
    // we log once per session so it's visible in DevTools.
    if (IS_NOAUTH_MODE && !enqueueExecutionEvent._warnedNoauth) {
      enqueueExecutionEvent._warnedNoauth = true
      console.warn(
        '[FlowOS:execSync] ⚠️  Event dropped — noauth mode (no VITE_SUPABASE_ANON).\n' +
        '  This session produces NO execution record. Nivos will not see this data.'
      )
    }
    return
  }

  // Validate before persisting (warn but never block)
  const check = FlowExecutionEventSchema.safeParse(event)
  if (!check.success) {
    console.warn('[FlowOS:execSync] invalid event shape — still queuing:', check.error.flatten())
  }

  const entry = /** @type {ExecQueueEntry} */ ({
    event,
    enqueuedAt: Date.now(),
    retries:    0,
  })

  if (navigator.onLine) {
    const ok = await syncSingle(entry)
    if (!ok) {
      const q = readQueue()
      writeQueue([...q, entry])
    }
  } else {
    const q = readQueue()
    writeQueue([...q, entry])
  }
}

/**
 * Flush the offline queue to Supabase.
 *
 * Call on:
 *   - App mount after login
 *   - `window.online` event
 *   - Periodic safety-net timer (every 5 min)
 *
 * @returns {Promise<{synced:number, failed:number, queued:number}>}
 */
export async function flushExecutionQueue() {
  if (!supabase) {
    // Noauth mode — queue will never flush. Return explicit state so callers know.
    return { synced: 0, failed: 0, queued: 0, noauth: true }
  }
  if (!navigator.onLine) {
    return { synced: 0, failed: 0, queued: readQueue().length }
  }

  const queue = readQueue()
  if (queue.length === 0) return { synced: 0, failed: 0, queued: 0 }

  const remaining = []
  let synced = 0
  let failed = 0

  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE)
    try {
      const { error } = await supabase
        .from('execution_events')
        .insert(batch.map(toRow))
      // Plain INSERT — no upsert/onConflict — avoids PostgREST SELECT policy
      // check on anon role (see syncSingle comment for full explanation).
      if (error) {
        if (error.code === '23505') {
          // Batch contains at least one duplicate — fall back to per-row insert
          // so new events land and duplicates are silently discarded.
          let batchSynced = 0
          for (const entry of batch) {
            const ok = await syncSingle(entry)
            if (ok) batchSynced++
            else remaining.push({ ...entry, retries: entry.retries + 1 })
          }
          synced  += batchSynced
          failed  += batch.length - batchSynced
        } else {
          for (const entry of batch) {
            remaining.push({ ...entry, retries: entry.retries + 1 })
          }
          failed += batch.length
        }
      } else {
        synced += batch.length
      }
    } catch {
      for (const entry of batch) {
        remaining.push({ ...entry, retries: entry.retries + 1 })
      }
      failed += batch.length
    }
  }

  writeQueue(remaining)
  if (synced > 0) setCursor(Date.now())

  return { synced, failed, queued: remaining.length }
}

// ─── Timeline fetch ───────────────────────────────────────────────────────────

/**
 * Fetch the full execution event timeline for a user.
 * Returns events ordered by occurred_at ASC (oldest first — correct replay order).
 *
 * Used on:
 *   - Login (full restore from remote)
 *   - Page refresh (fill gap since last cursor)
 *   - localStorage wipe (full restore)
 *   - Second device (full restore)
 *
 * @param {string} userEmail
 * @param {number} [sinceTs]  - epoch ms cursor — only fetch events after this point
 * @returns {Promise<import('../domain/executionSchema.js').FlowExecutionEvent[]>}
 */
export async function fetchExecutionTimeline(userEmail, sinceTs) {
  if (!supabase) {
    // Noauth mode — timeline is unavailable. Return empty with noauth flag.
    return []
  }
  if (!userEmail) return []

  try {
    let query = supabase
      .from('execution_events')
      // Include server_ts — used as tiebreaker for same-ms events (deterministic replay).
      // Without server_ts, two events at the same occurred_at are in non-deterministic order,
      // which can produce different final task statuses across devices.
      .select('id, type, occurred_at, week_id, task_id, payload, schema_v, user_email, server_ts')
      .eq('user_email', userEmail)
      .order('occurred_at', { ascending: true })
      .order('server_ts',   { ascending: true })  // deterministic tiebreaker

    if (sinceTs && sinceTs > 0) {
      query = query.gt('occurred_at', sinceTs)
    }

    const { data, error } = await query
    if (error || !data) return []

    return data.map(row => ({
      id:          row.id,
      schema_v:    row.schema_v ?? 1,
      type:        row.type,
      user_email:  row.user_email,
      occurred_at: Number(row.occurred_at),
      server_ts:   row.server_ts  ?? null,   // ISO string from DB — used as replay tiebreaker
      week_id:     row.week_id    ?? null,
      task_id:     row.task_id    ?? null,
      payload:     row.payload    ?? {},
    }))
  } catch (e) {
    console.warn('[FlowOS:execSync] fetchExecutionTimeline error:', e)
    return []
  }
}

// ─── Queue utilities ──────────────────────────────────────────────────────────

/** Returns the current queue length without processing. */
export function getExecutionQueueLength() {
  return readQueue().length
}

/**
 * Clear the sync queue and cursor.
 * Call after factory reset.
 */
export function clearExecutionSyncCursor() {
  try {
    localStorage.removeItem(CURSOR_KEY)
    localStorage.removeItem(QUEUE_KEY)
  } catch { /* non-critical */ }
}
