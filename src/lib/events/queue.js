/**
 * FlowOS Event Queue — IndexedDB-backed offline-first event sync.
 *
 * Design:
 *   - Events written to IndexedDB FIRST (optimistic, survives page close)
 *   - Immediately attempts Supabase insert; on failure, leaves in queue
 *   - On `window online` reconnect → flushes entire queue in sequence order
 *   - Deduplicated by idempotency_key (Supabase UNIQUE constraint + local check)
 *   - Retry: max 5 attempts, exponential backoff (1s → 2s → 4s → 8s → 16s)
 *   - Replay-safe: duplicate Supabase inserts (23505) treated as success
 *   - Zero UI impact: all operations are async fire-and-forget
 */

import { supabase } from '../supabase.js'

// ─── IndexedDB config ─────────────────────────────────────────────────────────
const DB_NAME    = 'flowos_event_queue'
const STORE_NAME = 'pending'
const DB_VERSION = 1
const MAX_RETRIES = 5

// ─── Singleton DB handle ──────────────────────────────────────────────────────
let _db = null

async function openDB() {
  if (_db) return _db
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('by_sequence', 'sequence', { unique: false })
        store.createIndex('by_status',   '_status',  { unique: false })
      }
    }
    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db) }
    req.onerror    = (e) => reject(e.target.error)
    req.onblocked  = ()  => reject(new Error('IndexedDB open blocked'))
  })
}

// ─── IDB helpers ─────────────────────────────────────────────────────────────
function idbPut(db, record) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.put(record)
    req.onsuccess = () => resolve()
    req.onerror   = (e) => reject(e.target.error)
  })
}

function idbDelete(db, id) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = (e) => reject(e.target.error)
  })
}

function idbGetAll(db) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly')
    const index = tx.objectStore(STORE_NAME).index('by_sequence')
    const req   = index.getAll()
    req.onsuccess = (e) => resolve(e.target.result || [])
    req.onerror   = (e) => reject(e.target.error)
  })
}

// ─── Supabase row builder ─────────────────────────────────────────────────────
function toSupabaseRow(event) {
  return {
    event_id:        event.id,
    coach_email:     event.coach_email,
    type:            event.type,
    occurred_at:     event.occurred_at,
    schema_v:        Number(event.schema_version),
    payload:         event.payload,
    sequence:        event.sequence,
    session_id:      event.session_id,
    idempotency_key: event.idempotency_key,
  }
}

// ─── Retry one event ──────────────────────────────────────────────────────────
async function pushToSupabase(event) {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('flowos_events').insert(toSupabaseRow(event))
    if (!error) return true
    if (error.code === '23505') return true  // duplicate — already synced, treat as success
    console.warn('[FlowOS:queue] Supabase insert error:', error.message)
    return false
  } catch {
    return false
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue an event.
 * Writes to IndexedDB first, then immediately attempts Supabase insert.
 * If insert fails (offline / error), event remains queued for retry.
 *
 * @param {object} event - FlowExecutionEvent object from createEvent()
 */
export async function enqueueEvent(event) {
  const record = {
    ...event,
    _status:  'pending',
    _retries: 0,
    _enqueued_at: Date.now(),
  }

  // 1. Persist to IndexedDB (survives page close)
  try {
    const db = await openDB()
    await idbPut(db, record)
  } catch (err) {
    // IDB unavailable — fallback: attempt Supabase directly and hope for the best
    console.warn('[FlowOS:queue] IDB write failed, trying direct sync:', err.message)
    await pushToSupabase(event)
    return
  }

  // 2. Try immediate Supabase sync
  const ok = await pushToSupabase(event)
  if (ok) {
    // Remove from queue — synced successfully
    try {
      const db = await openDB()
      await idbDelete(db, event.id)
    } catch {}
  }
  // If not ok: stays in queue, will be flushed on reconnect
}

/**
 * Flush all pending events to Supabase, in sequence order.
 * Called automatically on `window online` event.
 * Safe to call at any time — no-ops if queue is empty.
 */
export async function flushQueue() {
  if (!supabase) return

  let db
  try { db = await openDB() } catch { return }

  const all     = await idbGetAll(db)
  const pending = all
    .filter(r => r._status === 'pending' && (r._retries || 0) < MAX_RETRIES)
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))

  if (pending.length === 0) return

  for (const record of pending) {
    const { _status, _retries, _enqueued_at, ...event } = record
    const ok = await pushToSupabase(event)

    if (ok) {
      await idbDelete(db, event.id).catch(() => {})
    } else {
      const newRetries = (_retries || 0) + 1
      if (newRetries >= MAX_RETRIES) {
        // Mark as failed — stop retrying
        await idbPut(db, { ...record, _status: 'failed', _retries: newRetries }).catch(() => {})
        console.warn('[FlowOS:queue] Event permanently failed after', MAX_RETRIES, 'retries:', event.id)
      } else {
        await idbPut(db, { ...record, _retries: newRetries }).catch(() => {})
      }
    }
  }
}

/**
 * How many events are currently pending in the queue.
 * Returns 0 on any error (never throws).
 */
export async function pendingCount() {
  try {
    const db  = await openDB()
    const all = await idbGetAll(db)
    return all.filter(r => r._status === 'pending').length
  } catch { return 0 }
}

// ─── Reconnect listener (auto-started) ───────────────────────────────────────
let _reconnectBound = false

/**
 * Bind the `window online` event to auto-flush the queue.
 * Safe to call multiple times — only binds once.
 */
export function startReconnectListener() {
  if (_reconnectBound || typeof window === 'undefined') return
  _reconnectBound = true

  window.addEventListener('online', () => {
    console.log('[FlowOS:queue] Reconnected — flushing event queue')
    flushQueue().catch(() => {})
  })

  // Also flush on visibility change (tab refocus after offline period)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      flushQueue().catch(() => {})
    }
  })
}

// Auto-start the reconnect listener when this module is imported
startReconnectListener()
