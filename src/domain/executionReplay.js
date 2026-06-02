/**
 * FlowOS Execution Event Replay Engine
 *
 * Deterministically reconstructs FounderExecutionState and NivosExecutionState
 * from an ordered sequence of FlowExecutionEvents.
 *
 * Contract:
 *   - Input events MUST be sorted by occurred_at ASC (oldest first)
 *   - The same event list always produces the same output (pure function)
 *   - Events are never mutated
 *   - State starts empty: emptyFounderExecutionState()
 *
 * Usage:
 *   const timeline = await fetchExecutionTimeline(email)
 *   const state    = replayExecutionEvents(timeline)
 *   const nivos    = computeNivosExecutionState(state, email)
 */

import {
  emptyFounderExecutionState,
  EXECUTION_EVENT_TYPES as ET,
} from './executionSchema.js'

// ─── Per-event reducers ───────────────────────────────────────────────────────

/**
 * @param {import('./executionSchema.js').FounderExecutionState} state
 * @param {import('./executionSchema.js').FlowExecutionEvent} event
 * @returns {import('./executionSchema.js').FounderExecutionState}
 */
function applyTaskCreated(state, event) {
  const p = event.payload
  const taskId = p.task_id
  if (!taskId) return state

  // Skip if already exists (idempotent)
  if (state.tasks[taskId]) return state

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        id:            taskId,
        title:         p.title         || '',
        status:        p.status        || 'backlog',
        isBigThree:    p.is_big_three  || false,
        goalRef:       p.goal_ref      || null,
        goalType:      p.goal_type     || null,
        priority:      p.priority      || null,
        touchCount:    0,
        completedAt:   null,
        deletedAt:     null,
        statusHistory: [p.status || 'backlog'],
      },
    },
  }
}

function applyTaskUpdated(state, event) {
  const p = event.payload
  const taskId = p.task_id
  const existing = state.tasks[taskId]
  if (!existing) return state   // unknown task — skip

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...existing,
        title:      p.title      ?? existing.title,
        priority:   p.priority   ?? existing.priority,
        isBigThree: p.is_big_three !== undefined ? p.is_big_three : existing.isBigThree,
        goalRef:    p.goal_ref   !== undefined ? p.goal_ref  : existing.goalRef,
        goalType:   p.goal_type  !== undefined ? p.goal_type : existing.goalType,
      },
    },
  }
}

function applyTaskMoved(state, event) {
  const p = event.payload
  const taskId = p.task_id
  const existing = state.tasks[taskId]
  if (!existing) return state

  const isDeferral = p.is_deferral === true

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...existing,
        status:        p.to_status || existing.status,
        isBigThree:    p.is_big_three !== undefined ? p.is_big_three : existing.isBigThree,
        touchCount:    isDeferral ? existing.touchCount + 1 : existing.touchCount,
        statusHistory: [...existing.statusHistory, p.to_status].filter(Boolean),
      },
    },
  }
}

function applyTaskCompleted(state, event) {
  const p = event.payload
  const taskId = p.task_id
  const existing = state.tasks[taskId]
  if (!existing) return state

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...existing,
        status:        'done',
        completedAt:   p.completed_at || new Date(event.occurred_at).toISOString(),
        isBigThree:    p.was_big_three !== undefined ? p.was_big_three : existing.isBigThree,
        statusHistory: [...existing.statusHistory, 'done'],
      },
    },
  }
}

function applyTaskDeleted(state, event) {
  const p = event.payload
  const taskId = p.task_id
  const existing = state.tasks[taskId]
  if (!existing) return state

  // Keep in state with deletedAt set (for timeline analysis)
  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...existing,
        deletedAt: new Date(event.occurred_at).toISOString(),
      },
    },
    // Remove from Big3 if was there
    big3: state.big3.filter(id => id !== taskId),
  }
}

function applyTaskReopened(state, event) {
  const p = event.payload
  const taskId = p.task_id
  const existing = state.tasks[taskId]
  if (!existing) return state

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...existing,
        status:      'today',   // reopened tasks go back to today
        completedAt: null,
        deletedAt:   null,
        statusHistory: [...existing.statusHistory, 'today'],
      },
    },
  }
}

function applyBig3Set(state, event) {
  const p = event.payload
  const taskId = p.task_id
  if (!taskId) return state

  let newBig3
  if (p.is_big_three) {
    newBig3 = state.big3.includes(taskId) ? state.big3 : [...state.big3, taskId]
  } else {
    newBig3 = state.big3.filter(id => id !== taskId)
  }

  // Also update the task's isBigThree flag
  const task = state.tasks[taskId]

  return {
    ...state,
    big3: newBig3,
    currentWeekId: p.week_id || state.currentWeekId,
    tasks: task
      ? { ...state.tasks, [taskId]: { ...task, isBigThree: p.is_big_three } }
      : state.tasks,
  }
}

function applyWeekClosed(state, event) {
  const p = event.payload
  const weekId = p.week_id
  if (!weekId) return state

  // Archive completed tasks (mark as such in state)
  const updatedTasks = { ...state.tasks }
  for (const taskId of (p.completed_task_ids || [])) {
    if (updatedTasks[taskId]) {
      updatedTasks[taskId] = { ...updatedTasks[taskId], status: 'done' }
    }
  }
  // Apply decisions
  for (const [taskId, decision] of Object.entries(p.decisions || {})) {
    if (updatedTasks[taskId]) {
      if (decision === 'delete') {
        updatedTasks[taskId] = {
          ...updatedTasks[taskId],
          deletedAt: new Date(event.occurred_at).toISOString(),
        }
      } else if (decision === 'backlog') {
        updatedTasks[taskId] = { ...updatedTasks[taskId], status: 'backlog' }
      } else if (decision === 'next_week') {
        updatedTasks[taskId] = { ...updatedTasks[taskId], status: 'week' }
      }
    }
  }

  // Clear isBigThree flag on every non-deleted task.
  // state.big3 = [] already resets the ID list, but task.isBigThree must also
  // be cleared — computeNivosExecutionState derives big3CompletionRate from
  // t.isBigThree, not from state.big3. Without this, closed-week Big3 tasks
  // appear as Big3 in the NEXT week's stats.
  for (const taskId of Object.keys(updatedTasks)) {
    if (updatedTasks[taskId] && !updatedTasks[taskId].deletedAt) {
      updatedTasks[taskId] = { ...updatedTasks[taskId], isBigThree: false }
    }
  }

  return {
    ...state,
    tasks:          updatedTasks,
    big3:           [],  // Big3 resets each week
    closedWeekIds:  [...state.closedWeekIds, weekId],
    currentWeekId:  null,   // cleared until next event sets it
  }
}

// ─── Reducer map ──────────────────────────────────────────────────────────────

const REDUCERS = {
  [ET.TASK_CREATED]:   applyTaskCreated,
  [ET.TASK_UPDATED]:   applyTaskUpdated,
  [ET.TASK_MOVED]:     applyTaskMoved,
  [ET.TASK_COMPLETED]: applyTaskCompleted,
  [ET.TASK_DELETED]:   applyTaskDeleted,
  [ET.TASK_REOPENED]:  applyTaskReopened,
  [ET.BIG3_SET]:       applyBig3Set,
  [ET.WEEK_CLOSED]:    applyWeekClosed,
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Replay a sorted list of execution events into a FounderExecutionState.
 *
 * @param {import('./executionSchema.js').FlowExecutionEvent[]} events
 *   Must be sorted by occurred_at ASC. Unsorted input produces undefined behavior.
 *
 * @returns {import('./executionSchema.js').FounderExecutionState}
 */
export function replayExecutionEvents(events) {
  let state = emptyFounderExecutionState()

  // Sort by occurred_at ASC, with server_ts as deterministic tiebreaker for same-ms events.
  // Without the tiebreaker, task_created + task_moved at the same millisecond produce
  // non-deterministic results: if move fires before create, the reducer silently drops
  // the move (task doesn't exist yet), leaving the task in its initial status.
  // server_ts is a DB-side microsecond clock — it is always unique for sequential inserts.
  const sorted = [...events].sort((a, b) => {
    if (a.occurred_at !== b.occurred_at) return a.occurred_at - b.occurred_at
    // Tiebreaker: server_ts (ISO string — lexicographic sort is correct for ISO timestamps)
    if (a.server_ts && b.server_ts) return a.server_ts < b.server_ts ? -1 : 1
    return 0
  })

  for (const event of sorted) {
    const reducer = REDUCERS[event.type]
    if (!reducer) {
      console.warn('[FlowOS:replay] unknown event type, skipping:', event.type)
      continue
    }

    try {
      state = reducer(state, event)
    } catch (e) {
      console.warn('[FlowOS:replay] reducer error on event', event.id, ':', e)
      // Never throw — continue with pre-error state
    }

    state = {
      ...state,
      lastEventTs: Math.max(state.lastEventTs, event.occurred_at),
      eventCount:  state.eventCount + 1,
    }
  }

  return state
}

/**
 * Compute NivosExecutionState from the replayed FounderExecutionState.
 * Pure function — derive on demand, never store.
 *
 * @param {import('./executionSchema.js').FounderExecutionState} execState
 * @param {string} userEmail
 * @returns {import('./executionSchema.js').NivosExecutionState}
 */
export function computeNivosExecutionState(execState, userEmail) {
  const now = Date.now()
  const ms7d   = 7  * 24 * 60 * 60 * 1000
  const ms14d  = 14 * 24 * 60 * 60 * 1000

  const allTasks = Object.values(execState.tasks).filter(t => !t.deletedAt)
  const activeTasks = allTasks.filter(t => t.status !== 'done')

  // Completion in last 7d vs prior 7d
  const completedLast7d  = allTasks.filter(t =>
    t.completedAt && (now - new Date(t.completedAt).getTime()) < ms7d
  )
  const completedPrior7d = allTasks.filter(t => {
    if (!t.completedAt) return false
    const age = now - new Date(t.completedAt).getTime()
    return age >= ms7d && age < ms14d
  })

  // Big3 completion rate this week
  const big3Tasks     = allTasks.filter(t => t.isBigThree)
  const big3Done      = big3Tasks.filter(t => t.status === 'done').length
  const big3CompRate  = big3Tasks.length > 0 ? big3Done / big3Tasks.length : 0

  // Deferral analysis
  const avgDeferrals = activeTasks.length > 0
    ? activeTasks.reduce((sum, t) => sum + t.touchCount, 0) / activeTasks.length
    : 0

  const mostDeferred = [...activeTasks]
    .sort((a, b) => b.touchCount - a.touchCount)
    .slice(0, 3)
    .map(t => t.id)

  const stuck = activeTasks
    .filter(t => t.status === 'today' || t.status === 'doing')
    .map(t => t.id)

  // Trend
  const c7  = completedLast7d.length
  const c14 = completedPrior7d.length
  const trend = c7 > c14 + 1 ? 'improving'
              : c7 < c14 - 1 ? 'declining'
              : 'stable'

  // Recent wins (last 3 completed task titles)
  const recentWins = [...allTasks]
    .filter(t => t.completedAt)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 3)
    .map(t => t.title)

  // Completion rate (tasks done vs total non-deleted)
  const completionRate7d = allTasks.length > 0
    ? completedLast7d.length / allTasks.length
    : 0

  return {
    schema_v:            1,
    generatedAt:         now,
    userEmail,
    currentWeekId:       execState.currentWeekId,
    completionRate7d,
    big3CompletionRate:  big3CompRate,
    avgDeferralsPerTask: avgDeferrals,
    mostDeferredTaskIds: mostDeferred,
    stuckTaskIds:        stuck,
    trend,
    completedLast7d:     c7,
    completedPrior7d:    c14,
    recentWins,
  }
}

/**
 * Compute a WeeklyExecutionSnapshot from the current execution state + events.
 * Called when generating week_closed payload.
 *
 * @param {import('./executionSchema.js').FounderExecutionState} execState
 * @param {string} weekId
 * @param {Object} closeData - { decisions, mainWin, whatWorked, whatChange }
 * @returns {import('./executionSchema.js').WeeklyExecutionSnapshot}
 */
export function computeWeeklySnapshot(execState, weekId, closeData = {}) {
  const allTasks = Object.values(execState.tasks)
  const weekTasks = allTasks.filter(t => !t.deletedAt)

  const completed  = weekTasks.filter(t => t.status === 'done').map(t => t.id)
  const deleted    = allTasks.filter(t => t.deletedAt).map(t => t.id)
  const deferred   = weekTasks.filter(t => t.touchCount > 0 && t.status !== 'done').map(t => t.id)

  const big3Total  = weekTasks.filter(t => t.isBigThree).length
  const big3Done   = weekTasks.filter(t => t.isBigThree && t.status === 'done').length

  const rate = weekTasks.length > 0 ? completed.length / weekTasks.length : 0

  return {
    schema_v:         1,
    weekId,
    closedAt:         new Date().toISOString(),
    completedTaskIds: completed,
    deletedTaskIds:   deleted,
    deferredTaskIds:  deferred,
    big3Done,
    big3Total:        Math.min(big3Total, 3),
    totalTasks:       weekTasks.length,
    completionRate:   Math.round(rate * 100) / 100,
    decisions:        closeData.decisions || {},
    mainWin:          closeData.mainWin   || '',
    deferrals:        deferred.length,
  }
}
