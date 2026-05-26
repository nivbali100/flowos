/**
 * Supabase client for FlowOS.
 * Shared with the Nivos project — same project, tables prefixed with flowos_.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || 'https://lgvncozlqtbaxbkdjmms.supabase.co'
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || null

// Only initialize Supabase if we have a valid key — avoids crash when deployed without env vars
export const supabase = SUPABASE_ANON
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : null

// ─── Week Summary ─────────────────────────────────────────────────────────────

/**
 * Sync a week-close summary to Supabase.
 * Fire-and-forget — never blocks UI.
 */
export async function syncWeekSummary(summary, coachProfile) {
  if (!supabase) return
  try {
    // Compute a simple score: 40% completion + 30% big3 + 30% no-stuck bonus
    const completionScore = (summary.completionPct || 0) * 0.4
    const big3Score       = summary.big3Total > 0
      ? Math.round((summary.big3Done / summary.big3Total) * 100) * 0.3
      : 30
    const stuckPenalty    = Math.min(30, (summary.stuckCount || 0) * 5)
    const score           = Math.round(completionScore + big3Score + (30 - stuckPenalty))

    const { error } = await supabase.from('flowos_week_summaries').insert({
      coach_email:     coachProfile?.email || 'unknown@flowos.app',
      coach_name:      coachProfile?.name  || coachProfile?.email?.split('@')[0] || 'מלווה',
      saved_at:        summary.savedAt,
      week_label:      summary.weekLabel,
      week_number:     summary.weekNumber   || null,
      month:           summary.month,
      score,
      total_tasks:     summary.totalTasks,
      completed_count: summary.completedCount,
      completion_pct:  summary.completionPct,
      big3_total:      summary.big3Total,
      big3_done:       summary.big3Done,
      stuck_count:     summary.stuckCount,
      no_goal_count:   summary.noGoalCount,
      main_win:        summary.mainWin,
      what_worked:     summary.whatWorked,
      what_change:     summary.whatChange,
      raw_payload:     summary,
    })
    if (error) console.warn('[FlowOS] week summary sync failed:', error.message)
  } catch (e) {
    console.warn('[FlowOS] week summary sync error:', e)
  }
}

// ─── Coach Registry ───────────────────────────────────────────────────────────

/**
 * Register or update a coach profile in Supabase.
 * Called on Setup completion and whenever profile is updated.
 */
export async function upsertCoach(profile) {
  if (!supabase) return
  try {
    const row = {
      email:           profile.email,
      name:            profile.name            || null,
      business:        profile.businessName    || null,
      track:           profile.track           || 'ליווי',
      phone:           profile.phone           || null,
      status:          profile.status          || 'active',
      start_date:      profile.start_date      || new Date().toISOString().split('T')[0],
      annual_goals:    profile.annual_goals    || null,
      starting_point:  profile.starting_point  || null,
      quarterly_goals: profile.quarterly_goals || null,
      monthly_goals:   profile.monthly_goals   || null,
      updated_at:      new Date().toISOString(),
    }
    const { error } = await supabase
      .from('flowos_coaches')
      .upsert(row, { onConflict: 'email' })
    if (error) console.warn('[FlowOS] upsert coach error:', error.message)
  } catch (e) {
    console.warn('[FlowOS] upsert coach error:', e)
  }
}

/**
 * Sync quarterly + monthly goals to the coach's Supabase record.
 * Called fire-and-forget whenever these are updated.
 */
export async function syncGoalsToSupabase(coachEmail, { quarterly, monthly, annualGoals } = {}) {
  if (!supabase || !coachEmail) return
  try {
    const update = {}
    if (quarterly)   update.quarterly_goals = quarterly
    if (monthly)     update.monthly_goals   = monthly
    if (annualGoals) update.annual_goals    = annualGoals
    if (!Object.keys(update).length) return

    const { error } = await supabase
      .from('flowos_coaches')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('email', coachEmail)
    if (error) console.warn('[FlowOS] sync goals error:', error.message)
  } catch (e) {
    console.warn('[FlowOS] sync goals error:', e)
  }
}

/**
 * Fetch all coaches from the registry.
 */
export async function fetchCoaches() {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('flowos_coaches')
      .select('*')
      .order('name')
    if (error) { console.warn('[FlowOS] fetch coaches error:', error.message); return [] }
    return data || []
  } catch (e) {
    console.warn('[FlowOS] fetch coaches error:', e)
    return []
  }
}

// ─── Coach Push Messages ──────────────────────────────────────────────────────

/**
 * Send a push message from admin to a specific coach.
 * Stored in Supabase — coach's app polls and displays it.
 */
export async function sendCoachPush({ fromEmail, toEmail, message, taskTitle = null }) {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('flowos_coach_push').insert({
      from_email: fromEmail,
      to_email:   toEmail,
      message:    message.trim(),
      task_title: taskTitle || null,
    })
    if (error) { console.warn('[FlowOS] send push error:', error.message); return false }
    return true
  } catch (e) {
    console.warn('[FlowOS] send push error:', e)
    return false
  }
}

/**
 * Fetch unread push messages for a coach.
 * Returns the latest unread message, or null.
 */
export async function fetchUnreadPush(coachEmail) {
  if (!supabase || !coachEmail) return null
  try {
    const { data, error } = await supabase
      .from('flowos_coach_push')
      .select('*')
      .eq('to_email', coachEmail)
      .is('read_at', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()
    if (error) return null
    return data
  } catch (e) {
    return null
  }
}

/**
 * Mark a push message as read.
 */
export async function markPushRead(pushId) {
  if (!supabase) return
  try {
    await supabase
      .from('flowos_coach_push')
      .update({ read_at: new Date().toISOString() })
      .eq('id', pushId)
  } catch (e) {
    console.warn('[FlowOS] mark push read error:', e)
  }
}

// ─── Weekly Forms ─────────────────────────────────────────────────────────────

/**
 * Fetch all coach week summaries (for admin dashboard).
 */
export async function fetchCoachSummaries() {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('flowos_week_summaries')
      .select('*')
      .order('saved_at', { ascending: false })
      .limit(200)
    if (error) { console.warn('[FlowOS] fetch summaries error:', error.message); return [] }
    return data || []
  } catch (e) {
    console.warn('[FlowOS] fetch summaries error:', e)
    return []
  }
}

/**
 * Fetch all recent weekly form submissions (for admin dashboard).
 */
export async function fetchAllWeeklyForms() {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('flowos_weekly_forms')
      .select('*')
      .order('filled_at', { ascending: false })
      .limit(200)
    if (error) { console.warn('[FlowOS] fetch forms error:', error.message); return [] }
    return data || []
  } catch (e) {
    return []
  }
}

// ─── Task Sync ────────────────────────────────────────────────────────────────

/**
 * Upsert a single task to Supabase.
 * Fire-and-forget — never blocks UI.
 */
export async function syncTaskToSupabase(task, coachEmail) {
  if (!supabase || !coachEmail || !task?.id) return
  try {
    const row = {
      coach_email:       coachEmail,
      task_id:           task.id,
      title:             task.title             || '',
      status:            task.status            || 'backlog',
      priority:          task.priority          || 'medium',
      type:              task.type              || 'strategy',
      energy_level:      task.energyLevel       || null,
      is_big_three:      task.isBigThree        || false,
      goal_ref:          task.goalRef           || null,
      goal_type:         task.goalType          || null,
      estimated_minutes: task.estimatedMinutes  || null,
      due_date:          task.dueDate           || null,
      notes:             task.notes             || null,
      doing_started_at:  task.doingStartedAt    || null,
      actual_minutes:    task.actualMinutes      || null,
      moved_to_today_at: task.movedToTodayAt    || null,
      completed_at:      task.completedAt       || null,
      updated_at:        new Date().toISOString(),
    }
    const { error } = await supabase
      .from('flowos_tasks')
      .upsert(row, { onConflict: 'coach_email,task_id' })
    if (error) console.warn('[FlowOS] task sync error:', error.message)
  } catch (e) {
    console.warn('[FlowOS] task sync error:', e)
  }
}

/**
 * Delete a task from Supabase (called on hard delete).
 */
export async function deleteTaskFromSupabase(taskId, coachEmail) {
  if (!supabase || !coachEmail || !taskId) return
  try {
    await supabase
      .from('flowos_tasks')
      .delete()
      .eq('coach_email', coachEmail)
      .eq('task_id', taskId)
  } catch (e) {
    console.warn('[FlowOS] task delete error:', e)
  }
}

/**
 * Fetch all tasks for all trainees (for admin dashboard).
 * Returns a Map<email, taskStats> for O(1) lookup.
 */
export async function fetchAllTraineeTasks() {
  if (!supabase) return new Map()
  try {
    const { data, error } = await supabase
      .from('flowos_tasks')
      .select('coach_email, status, is_big_three, priority, completed_at, updated_at')
      .order('updated_at', { ascending: false })
    if (error) { console.warn('[FlowOS] fetch trainee tasks error:', error.message); return new Map() }
    // Group by email → compute stats
    const map = new Map()
    for (const row of (data || [])) {
      if (!map.has(row.coach_email)) {
        map.set(row.coach_email, { total: 0, active: 0, done: 0, doing: 0, big3: 0, backlog: 0 })
      }
      const s = map.get(row.coach_email)
      s.total++
      if (row.status === 'doing')   s.doing++
      if (row.status === 'done')    s.done++
      if (row.status === 'backlog') s.backlog++
      if (['today', 'week', 'doing'].includes(row.status)) s.active++
      if (row.is_big_three) s.big3++
    }
    return map
  } catch (e) {
    console.warn('[FlowOS] fetch trainee tasks error:', e)
    return new Map()
  }
}

/**
 * Fetch all tasks for a specific coach (read-back on startup).
 * Returns array mapped to FlowOS task shape, empty on error.
 */
export async function fetchTasksForCoach(coachEmail) {
  if (!supabase || !coachEmail) return []
  try {
    const { data, error } = await supabase
      .from('flowos_tasks')
      .select('*')
      .eq('coach_email', coachEmail)
      .order('updated_at', { ascending: false })
    if (error) { console.warn('[FlowOS] fetch tasks error:', error.message); return [] }
    return (data || []).map(row => ({
      id:               row.task_id,
      title:            row.title || '',
      status:           row.status || 'backlog',
      priority:         row.priority || 'medium',
      type:             row.type || 'strategy',
      isBigThree:       row.is_big_three || false,
      goalRef:          row.goal_ref || '',
      goalType:         row.goal_type || 'none',
      estimatedMinutes: row.estimated_minutes || null,
      notes:            row.notes || '',
      energyLevel:      row.energy_level || null,
      doingStartedAt:   row.doing_started_at || null,
      actualMinutes:    row.actual_minutes || null,
      movedToTodayAt:   row.moved_to_today_at || null,
      completedAt:      row.completed_at || null,
      updatedAt:        row.updated_at || new Date().toISOString(),
      createdAt:        row.created_at || new Date().toISOString(),
      description:      '',
      owner:            'trainee',
      source:           'synced',
      aiAnalysis:       null,
      touchCount:       0,
      subtasks:         [],
      _v2:              true,
    }))
  } catch (e) {
    console.warn('[FlowOS] fetch tasks error:', e)
    return []
  }
}

/**
 * Fetch latest weekly form data for a specific coach (from n8n).
 */
export async function fetchLatestFormData(coachEmail) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('flowos_weekly_forms')
      .select('*')
      .eq('coach_email', coachEmail)
      .order('filled_at', { ascending: false })
      .limit(1)
      .single()
    if (error) return null
    return data
  } catch (e) {
    return null
  }
}
