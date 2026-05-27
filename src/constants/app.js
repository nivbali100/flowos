/**
 * FlowOS — App-wide constants.
 * Single source of truth for all magic numbers and configuration values.
 * Import from here instead of repeating literals across files.
 */

// ─── Time & Capacity ──────────────────────────────────────────────────────────
/** Total minutes of focused work capacity per day */
export const DAILY_CAPACITY_MINUTES = 240

/**
 * Hours a task can sit in "doing" before being flagged as stuck (pressure/coaching UI).
 * Used by: flowBrain.js, pressureEngine, CloseWeekModal, WeeklyStateBanner.
 * Intentionally short (3h) — pressure nudge, not the hard "stuck" detector.
 */
export const STUCK_HOURS = 3

/**
 * Hours a task must be in "doing" before stuckDetector/card shows the stuck warning.
 * Used by: stuckDetector.js, executionEngine (getNextBestTaskWithContext).
 * Intentionally longer (24h) — serious block, not just slow progress.
 */
export const STUCK_HARD_HOURS = 24

/** Hours since movedToTodayAt before a task is flagged as carryover */
export const CARRYOVER_THRESHOLD_HOURS = 20

// ─── Tasks ────────────────────────────────────────────────────────────────────
/** Maximum Big 3 tasks per week */
export const MAX_BIG3 = 3

/** Maximum weekly summaries to keep in localStorage */
export const MAX_WEEKLY_SUMMARIES = 16

/** Maximum tasks to show in TodayFocus panel */
export const TODAY_FOCUS_MAX = 7

// ─── UI Timings (ms) ─────────────────────────────────────────────────────────
/** Undo toast display duration */
export const UNDO_TOAST_MS = 5000

/** Bounce animation duration for daily score milestone */
export const BOUNCE_ANIM_MS = 1500

/** Big3 error message display duration */
export const BIG3_ERROR_MS = 2500

/** Morning plan XP reward */
export const XP_MORNING_PLAN = 50

// ─── XP Values ───────────────────────────────────────────────────────────────
export const XP_VALUES = {
  task_done:    10,
  big3_done:    25,
  perfect_day:  50,
  week_closed:  100,
  morning_plan: 50,
}

// ─── Weekly score component definitions (shared Dashboard + Performance) ──────
export const SCORE_COMPONENTS = [
  { key: 'kpi',          label: 'ביצוע KPI',    weight: '40%', color: '#3b82f6', emoji: '📊' },
  { key: 'bigThree',     label: '3 הגדולים',    weight: '30%', color: '#8b5cf6', emoji: '🎯' },
  { key: 'improvement',  label: 'שיפור עצמי',   weight: '15%', color: '#10b981', emoji: '📈' },
  { key: 'preservation', label: 'שימור הרגלים', weight: '15%', color: '#f59e0b', emoji: '🔒' },
]
