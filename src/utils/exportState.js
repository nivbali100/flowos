/**
 * getExportableExecutionState()
 *
 * Pure, deterministic, React-independent function.
 * Returns the complete execution state of a FlowOS user for Nivos AI consumption.
 *
 * Design rules:
 *   - No React imports, no hooks, no side effects
 *   - All inputs from localStorage (no DOM, no event listeners)
 *   - Stable schema — add fields, never remove
 *   - Safe for replay — idempotent, pure
 *   - Testable in Node.js or Edge Function
 *
 * Used by:
 *   - Nivos telegram-webhook (reads directly from Supabase mirror)
 *   - Admin dashboard execution analytics
 *   - Weekly export / coach review
 */

import { getLocalEvents } from './events.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadLS(key, fallback) {
  try {
    const s = localStorage.getItem(key)
    return s ? JSON.parse(s) : fallback
  } catch { return fallback }
}

function hoursAgo(isoString) {
  if (!isoString) return null
  return (Date.now() - new Date(isoString).getTime()) / 3_600_000
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * @param {object} [overrides] - optional overrides (for testing, pass data directly)
 * @param {object[]} [overrides.tasks]
 * @param {object}   [overrides.profile]
 * @param {object}   [overrides.monthly]
 * @param {object}   [overrides.quarterly]
 * @param {object[]} [overrides.weeklySummaries]
 * @param {Date}     [overrides.now]
 * @returns {ExecutionState}
 */
export function getExportableExecutionState(overrides = {}) {
  const now             = overrides.now || new Date()
  const tasks           = overrides.tasks           || loadLS('flowos_tasks',            [])
  const profile         = overrides.profile         || loadLS('flowos_profile',           {})
  const monthly         = overrides.monthly         || loadLS('flowos_monthly',           {})
  const quarterly       = overrides.quarterly       || loadLS('flowos_quarterly',         {})
  const weeklySummaries = overrides.weeklySummaries || loadLS('flowos_weekly_summaries',  [])

  // ── Active tasks (not archived, not done) ───────────────────────────────────
  const activeTasks   = tasks.filter(t => !t.archivedAt && t.status !== 'done')
  const doingTasks    = activeTasks.filter(t => t.status === 'doing')
  const todayTasks    = activeTasks.filter(t => t.status === 'today')
  const weekTasks     = activeTasks.filter(t => t.status === 'week')
  const backlogTasks  = activeTasks.filter(t => t.status === 'backlog')
  const big3Tasks     = activeTasks.filter(t => t.isBigThree)

  // ── Stuck tasks (in doing > 24h, or today > 20h) ────────────────────────────
  const stuckTasks = activeTasks.filter(t => {
    if (t.status === 'doing' && t.doingStartedAt) {
      return hoursAgo(t.doingStartedAt) > 24
    }
    if (t.status === 'today' && t.movedToTodayAt) {
      return hoursAgo(t.movedToTodayAt) > 20
    }
    return false
  })

  // ── Today completion (current calendar day) ─────────────────────────────────
  const sot         = startOfToday()
  const completedToday = tasks.filter(t =>
    t.status === 'done' && t.completedAt && new Date(t.completedAt) >= sot
  )

  // ── Workload ────────────────────────────────────────────────────────────────
  const estimatedMinutesInPlay = [...doingTasks, ...todayTasks]
    .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0)

  // ── Task churn / avoidance ──────────────────────────────────────────────────
  const highAvoidanceTasks = activeTasks
    .filter(t => (t.touchCount || 0) >= 3)
    .sort((a, b) => (b.touchCount || 0) - (a.touchCount || 0))

  // ── Momentum: completion velocity over last 7 days ──────────────────────────
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3_600_000)
  const completedLast7Days = tasks.filter(t =>
    t.status === 'done' && t.completedAt && new Date(t.completedAt) >= sevenDaysAgo
  )

  // ── Carryover: tasks moved to today but not completed in > 20h ──────────────
  const carryoverTasks = todayTasks.filter(t =>
    t.movedToTodayAt && hoursAgo(t.movedToTodayAt) > 20
  )

  // ── Goal alignment ──────────────────────────────────────────────────────────
  const totalActive       = activeTasks.length
  const linkedToGoal      = activeTasks.filter(t => t.goalRef && t.goalRef.trim()).length
  const goalAlignmentRate = totalActive > 0 ? Math.round((linkedToGoal / totalActive) * 100) : 100

  // ── Weekly summaries ────────────────────────────────────────────────────────
  const lastWeek = weeklySummaries[0] || null
  const avgCompletionPct = weeklySummaries.length > 0
    ? Math.round(weeklySummaries.slice(0, 4).reduce((s, w) => s + (w.completionPct || 0), 0) /
        Math.min(4, weeklySummaries.length))
    : null

  // ── Focus state ─────────────────────────────────────────────────────────────
  const focusTask = doingTasks[0] || null
  const focusMinutesElapsed = focusTask?.doingStartedAt
    ? Math.round((now.getTime() - new Date(focusTask.doingStartedAt).getTime()) / 60000)
    : null

  // ── Behavioral pressure ─────────────────────────────────────────────────────
  const behavioralPressure = (() => {
    let score = 0
    if (stuckTasks.length > 0)         score += stuckTasks.length * 20
    if (carryoverTasks.length > 0)     score += carryoverTasks.length * 15
    if (highAvoidanceTasks.length > 0) score += highAvoidanceTasks.length * 10
    if (estimatedMinutesInPlay > 240)  score += 25  // over daily capacity
    return Math.min(100, score)
  })()

  // ── Recent events (for Nivos context) ───────────────────────────────────────
  const recentEvents = getLocalEvents(20)

  // ─── Return shape ────────────────────────────────────────────────────────────
  return {
    // Meta
    generated_at:        now.toISOString(),
    schema_v:            1,
    coach_email:         profile.email || null,
    coach_name:          profile.name  || null,

    // Active task buckets
    doing:               doingTasks.map(taskSummary),
    today:               todayTasks.map(taskSummary),
    week:                weekTasks.map(taskSummary),
    backlog_count:       backlogTasks.length,
    big3:                big3Tasks.map(taskSummary),

    // Execution state
    focus_task:          focusTask ? taskSummary(focusTask) : null,
    focus_minutes_elapsed: focusMinutesElapsed,
    stuck_tasks:         stuckTasks.map(taskSummary),
    carryover_tasks:     carryoverTasks.map(taskSummary),
    high_avoidance_tasks: highAvoidanceTasks.slice(0, 5).map(taskSummary),

    // Workload
    estimated_minutes_in_play: estimatedMinutesInPlay,
    daily_capacity_minutes:    240,
    capacity_used_pct:         Math.round((estimatedMinutesInPlay / 240) * 100),

    // Today completion
    completed_today_count: completedToday.length,
    completed_today_tasks: completedToday.slice(0, 5).map(taskSummary),

    // Momentum
    completed_last_7_days: completedLast7Days.length,
    momentum_signal:       completedLast7Days.length >= 10 ? 'high'
                         : completedLast7Days.length >= 5  ? 'medium' : 'low',

    // Patterns
    goal_alignment_rate:     goalAlignmentRate,
    behavioral_pressure:     behavioralPressure,
    task_churn_count:        highAvoidanceTasks.length,

    // Weekly history
    last_week_summary:     lastWeek ? {
      week_label:     lastWeek.weekLabel,
      completion_pct: lastWeek.completionPct,
      big3_done:      lastWeek.big3Done,
      big3_total:     lastWeek.big3Total,
      stuck_count:    lastWeek.stuckCount,
      main_win:       lastWeek.mainWin,
      what_worked:    lastWeek.whatWorked,
      what_change:    lastWeek.whatChange,
    } : null,
    avg_completion_pct_4w: avgCompletionPct,

    // Goals context
    monthly_goals: {
      moves:          monthly.threeKeyMoves || [],
      revenue_target: monthly.revenueTarget || null,
      month:          monthly.month || null,
    },
    quarterly_goals: {
      moves:          quarterly.threeKeyMoves || [],
    },

    // Recent behavior
    recent_events: recentEvents,
  }
}

// ─── Minimal task summary (keep small for prompts) ───────────────────────────
function taskSummary(t) {
  return {
    id:           t.id,
    title:        t.title,
    status:       t.status,
    priority:     t.priority,
    is_big_three: t.isBigThree || false,
    goal_ref:     t.goalRef || null,
    goal_type:    t.goalType || null,
    energy_level: t.energyLevel || null,
    touch_count:  t.touchCount || 0,
    estimated_minutes: t.estimatedMinutes || null,
    doing_started_at:  t.doingStartedAt || null,
    moved_to_today_at: t.movedToTodayAt || null,
    completed_at:      t.completedAt || null,
  }
}
