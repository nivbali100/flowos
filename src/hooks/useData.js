/**
 * Central data access hook.
 * Simulates a logged-in trainee (lior@example.com by default).
 * All page components use this — never import from /data directly.
 */
import {
  rawFormData, getLatestWeek, getPreviousWeek, getWeeksForTrainee, getAllTrainees,
  trainees, getTrainee,
  quarterlyGoals, monthlyGoals, getQuarterlyGoals, getMonthlyGoals, getCurrentMonthGoals,
  goalsExcel, getGoalsExcel,
  challengeConfig, challengeData, getChallengeConfig, getChallengeData,
} from '../data/index.js'
import { calcWeeklyScore } from '../utils/scoring.js'
import { calcSmartInsight } from '../utils/insights.js'
import { getTimeBasedStatus } from '../utils/status.js'
import { usePeriod } from './usePeriod.js'

// Read monthly actual KPIs from localStorage (set by user via Goals page)
function getMonthlyActuals() {
  try {
    const m = JSON.parse(localStorage.getItem('flowos_monthly') || '{}')
    return m.actualKPIs || {}
  } catch { return {} }
}

// Read monthly targets from localStorage
function getMonthlyTargets() {
  try {
    return JSON.parse(localStorage.getItem('flowos_monthly') || '{}')
  } catch { return {} }
}

// Read current user's email from localStorage profile (set during Setup).
// Falls back to seed email only if no profile is saved.
function getCurrentUserEmail() {
  try {
    const p = JSON.parse(localStorage.getItem('flowos_profile') || '{}')
    return p.email || 'niv@flowos.app'
  } catch { return 'niv@flowos.app' }
}

export function useCurrentUser() {
  return getCurrentUserEmail()
}

export function useData(key) {
  const email   = getCurrentUserEmail()
  const period  = usePeriod()
  const actuals = getMonthlyActuals()
  const targets = getMonthlyTargets()

  // Pre-compute shared values used by multiple keys
  const latest   = getLatestWeek(email)
  const previous = getPreviousWeek(email)
  const allWeeks = getWeeksForTrainee(email)

  const score     = calcWeeklyScore(latest)
  const prevScore = calcWeeklyScore(previous)

  // Momentum: compare current vs previous weekly score
  const momentumScore = Math.round((score.score / 100) * 10 * 10) / 10  // 0–10 scale
  const momentumTrend =
    score.score > prevScore.score + 5 ? 'up' :
    score.score < prevScore.score - 5 ? 'down' : 'stable'

  // Status message for the month status banner
  const revPct = latest?.targetsRevenue
    ? Math.round(((latest.revenue || 0) / latest.targetsRevenue) * 100)
    : 0
  const statusMessage =
    revPct >= 90 ? `ביצוע מצוין — ${revPct}% מהיעד השבועי הושג` :
    revPct >= 70 ? `בקצב סביר — ${revPct}% מהיעד. כדאי להאיץ` :
                  `מאחור — רק ${revPct}% מהיעד. נדרשת פעולה מיידית`

  const store = {
    // Current user
    'user': getTrainee(email),
    'user.email': email,

    // RAW form data
    'raw.latest':   latest,
    'raw.previous': previous,
    'raw.allWeeks': allWeeks,
    'raw.all':      rawFormData,

    // All trainees (admin)
    'admin.trainees':    trainees,
    'admin.allTrainees': getAllTrainees(),
    'admin.rawAll':      rawFormData,

    // Goals
    'goals.quarterly':    getQuarterlyGoals(email),
    'goals.monthly':      getMonthlyGoals(email),
    'goals.currentMonth': getCurrentMonthGoals(email),

    // Goals Excel — uses dynamic month label
    'goalsExcel.current': getGoalsExcel(email, period.monthLabel),

    // Challenge
    'challenge.config': getChallengeConfig(email),
    'challenge.data':   getChallengeData(email),

    // ─── Dashboard snapshot (Home module) ─────────────────────────────
    'dashboard': {
      // Monthly status banner
      monthStatus:   getTimeBasedStatus(latest?.revenue || 0, latest?.targetsRevenue || 0),
      statusMessage,
      month:         period.monthLabel,

      // Smart insight (plain string)
      insight:     calcSmartInsight(latest, allWeeks, score.score)?.text || '',
      lastUpdated: latest?.filledAt || null,

      // Momentum indicator
      momentumScore,
      momentumTrend,

      // Top 3 tasks (used by TopThreeTasks component)
      topThree: (latest?.bigThree || ['—', '—', '—']).map((text, i) => ({
        id:      i,
        text,
        urgency: i === 0 ? 'high' : 'normal',
      })),

      // Gap to goal (revenue)
      gapRevenue: Math.max(0, (latest?.targetsRevenue || 0) - (latest?.revenue || 0)),

      // KPI summary — real user data from localStorage takes priority over seed data
      kpis: [
        { id: 'leads',    label: 'לידים',  actual: actuals.leads    ?? latest?.leads    ?? 0, target: targets.leadsTarget    || latest?.targetsLeads    || 0 },
        { id: 'calls',    label: 'שיחות',  actual: actuals.calls    ?? latest?.calls    ?? 0, target: targets.callsTarget    || latest?.targetsCalls    || 0 },
        { id: 'closures', label: 'סגירות', actual: actuals.closures ?? latest?.closures ?? 0, target: targets.closuresTarget || latest?.targetsClosures || 0 },
        { id: 'revenue',  label: 'הכנסות', actual: actuals.revenue  ?? latest?.revenue  ?? 0, target: targets.revenueTarget  || latest?.targetsRevenue  || 0, isCurrency: true },
      ],
    },
  }

  return store[key] ?? null
}
