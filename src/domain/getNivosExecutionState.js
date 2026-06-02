/**
 * getNivosExecutionState — Pure server-safe read interface for Nivos
 *
 * Contract:
 *   - Reads ONLY from execution_events (never flowos_tasks)
 *   - Never reads localStorage
 *   - Never reads UI state
 *   - Never mutates anything
 *   - Zero side effects
 *   - Safe to call from any server context (Edge Function, Node, Deno)
 *
 * Usage (inside Nivos telegram-webhook, service_role context):
 *
 *   import { getNivosExecutionState } from './getNivosExecutionState.js'
 *   const state = await getNivosExecutionState(supabase, client.email)
 *   // state.trend, state.big3CompletionRate, state.recentWins, etc.
 *
 * @module getNivosExecutionState
 */

import { replayExecutionEvents, computeNivosExecutionState } from './executionReplay.js'

/**
 * Fetch execution_events for a user and replay them into NivosExecutionState.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 *   Must be initialised with the service_role key — this function does not
 *   perform auth on behalf of the user; it is a trusted server-side read.
 *
 * @param {string} userEmail   The coach's email address (primary key of events)
 * @param {Object} [opts]
 * @param {number} [opts.sinceTs]   Epoch ms cursor — only fetch events after this point
 *
 * @returns {Promise<import('./executionReplay.js').NivosExecutionState | null>}
 *   Returns null when userEmail is missing or the query fails.
 *   Never throws.
 */
export async function getNivosExecutionState(supabase, userEmail, opts = {}) {
  if (!supabase || !userEmail) return null

  try {
    let query = supabase
      .from('execution_events')
      .select('id, type, occurred_at, week_id, task_id, payload, schema_v, user_email, server_ts')
      .eq('user_email', userEmail)
      .order('occurred_at', { ascending: true })
      .order('server_ts',   { ascending: true })   // deterministic tiebreaker

    if (opts.sinceTs && opts.sinceTs > 0) {
      query = query.gt('occurred_at', opts.sinceTs)
    }

    const { data, error } = await query

    if (error || !data) {
      console.warn('[getNivosExecutionState] query error:', error?.message)
      return null
    }

    // Map DB rows → FlowExecutionEvent shape
    const events = data.map(row => ({
      id:          row.id,
      schema_v:    row.schema_v ?? 1,
      type:        row.type,
      user_email:  row.user_email,
      occurred_at: Number(row.occurred_at),
      server_ts:   row.server_ts  ?? null,
      week_id:     row.week_id    ?? null,
      task_id:     row.task_id    ?? null,
      payload:     row.payload    ?? {},
    }))

    // Pure deterministic replay — no mutation, no side effects
    const execState  = replayExecutionEvents(events)
    const nivosState = computeNivosExecutionState(execState, userEmail)

    return nivosState
  } catch (e) {
    console.warn('[getNivosExecutionState] unexpected error:', e)
    return null
  }
}
