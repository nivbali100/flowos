/**
 * useExecutionSync
 *
 * Manages the full lifecycle of execution event persistence:
 *
 *  1. On login (userEmail changes):
 *     a. Flush any pending offline queue
 *     b. Fetch full remote timeline
 *     c. Replay events → FounderExecutionState
 *     d. Emit reconstituted state for store consumption
 *
 *  2. On network reconnect (window 'online' event):
 *     - Flush offline queue
 *
 *  3. Periodic interval (every 5 min while app is open):
 *     - Flush queue (handles missed 'online' events)
 *
 * Returns sync status for optional UI display.
 * Never blocks the UI — all operations are fire-and-forget.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  enqueueExecutionEvent,
  flushExecutionQueue,
  fetchExecutionTimeline,
  getExecutionQueueLength,
} from '../services/executionSync.js'
import {
  replayExecutionEvents,
  computeNivosExecutionState,
} from '../domain/executionReplay.js'

const FLUSH_INTERVAL_MS = 5 * 60 * 1000  // 5 minutes

/**
 * @typedef {Object} ExecutionSyncStatus
 * @property {number}   queueLength  - events waiting in offline queue
 * @property {boolean}  syncing      - true while a sync or restore is in progress
 * @property {string|undefined} lastSyncAt  - ISO timestamp of last successful flush
 * @property {string|undefined} lastError   - error from last flush
 * @property {number}   replayedEvents      - total events replayed on last restore
 */

/**
 * @param {string|null} userEmail
 * @param {function} onRestore  - called with (FounderExecutionState, NivosExecutionState) on timeline restore
 * @returns {ExecutionSyncStatus}
 */
export function useExecutionSync(userEmail, onRestore) {
  const [status, setStatus] = useState(/** @type {ExecutionSyncStatus} */ ({
    queueLength:    getExecutionQueueLength(),
    syncing:        false,
    lastSyncAt:     undefined,
    lastError:      undefined,
    replayedEvents: 0,
  }))

  // Prevent duplicate restores for the same userEmail
  const restoredForUser = useRef(null)

  // ── 1. On login: flush queue + restore + replay ───────────────────────────
  useEffect(() => {
    if (!userEmail) {
      restoredForUser.current = null
      return
    }
    if (restoredForUser.current === userEmail) return
    restoredForUser.current = userEmail

    let cancelled = false

    async function loginRestore() {
      setStatus(s => ({ ...s, syncing: true }))

      try {
        // a) Flush pending queue first (ensure no events are lost before fetch)
        await flushExecutionQueue()
        if (cancelled) return

        // b) Fetch full timeline from Supabase (oldest first — correct replay order)
        const events = await fetchExecutionTimeline(userEmail)
        if (cancelled) return

        // c) Replay into FounderExecutionState
        const execState = replayExecutionEvents(events)
        const nivosState = computeNivosExecutionState(execState, userEmail)

        // d) Notify consumer
        if (!cancelled && onRestore) {
          onRestore(execState, nivosState)
        }

        setStatus({
          queueLength:    getExecutionQueueLength(),
          syncing:        false,
          lastSyncAt:     new Date().toISOString(),
          lastError:      undefined,
          replayedEvents: events.length,
        })
      } catch (err) {
        if (!cancelled) {
          setStatus(s => ({
            ...s,
            syncing:   false,
            lastError: err instanceof Error ? err.message : 'restore failed',
          }))
        }
      }
    }

    void loginRestore()
    return () => { cancelled = true }
  }, [userEmail, onRestore])

  // ── 2. On network reconnect: flush queue ──────────────────────────────────
  useEffect(() => {
    if (!userEmail) return

    async function handleOnline() {
      setStatus(s => ({ ...s, syncing: true }))
      try {
        const result = await flushExecutionQueue()
        setStatus(s => ({
          ...s,
          queueLength: result.queued,
          syncing:     false,
          lastSyncAt:  result.synced > 0 ? new Date().toISOString() : s.lastSyncAt,
          lastError:   result.failed > 0 ? `${result.failed} events failed to sync` : undefined,
        }))
      } catch {
        setStatus(s => ({ ...s, syncing: false }))
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [userEmail])

  // ── 3. Periodic flush (safety net) ───────────────────────────────────────
  useEffect(() => {
    if (!userEmail) return

    const interval = setInterval(async () => {
      if (!navigator.onLine) return
      try {
        const result = await flushExecutionQueue()
        if (result.synced > 0 || result.failed > 0) {
          setStatus(s => ({
            ...s,
            queueLength: result.queued,
            lastSyncAt:  result.synced > 0 ? new Date().toISOString() : s.lastSyncAt,
          }))
        }
      } catch { /* periodic flush — ignore errors */ }
    }, FLUSH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [userEmail])

  return status
}

// ─── Re-export for convenience so store only imports from this hook ───────────
export { enqueueExecutionEvent }
