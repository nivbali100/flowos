/**
 * Time-based status logic — exact from הפסגה documents.
 * Compares actual progress vs expected progress based on time elapsed in month.
 *
 * Green:  actual >= 90% of expected_progress
 * Yellow: actual >= 70% of expected_progress
 * Red:    actual < 70% of expected_progress
 * Gray:   no data
 */

export function getTimeBasedStatus(actual, monthlyTarget, options = {}) {
  if (!monthlyTarget || monthlyTarget === 0) return 'gray'
  if (actual === null || actual === undefined) return 'gray'

  const now = new Date()
  const dayOfMonth = options.dayOfMonth || now.getDate()
  const daysInMonth = options.daysInMonth || new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  const timeElapsedRatio = dayOfMonth / daysInMonth
  const expectedProgress = monthlyTarget * timeElapsedRatio

  if (expectedProgress === 0) return 'green'

  const ratio = actual / expectedProgress

  if (ratio >= 0.9) return 'green'
  if (ratio >= 0.7) return 'yellow'
  return 'red'
}

// Simple status (non-time-based) — for admin overview
export function getSimpleStatus(actual, target) {
  if (!target || target === 0) return 'gray'
  const ratio = actual / target
  if (ratio >= 0.7) return 'green'
  if (ratio >= 0.5) return 'yellow'
  return 'red'
}

// Admin status: green (filled + performing), yellow (filled + mediocre), red (not filled or very low)
export function getAdminStatus(weekData) {
  if (!weekData || !weekData.filledAt) return 'red'

  const daysSinceFill = Math.floor(
    (Date.now() - new Date(weekData.filledAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceFill > 10) return 'red' // didn't fill this week

  // Check overall performance
  const kpiAvg = [
    weekData.targetsLeads ? weekData.leads / weekData.targetsLeads : 0,
    weekData.targetsCalls ? weekData.calls / weekData.targetsCalls : 0,
    weekData.targetsClosures ? weekData.closures / weekData.targetsClosures : 0,
    weekData.targetsRevenue ? weekData.revenue / weekData.targetsRevenue : 0,
  ].reduce((s, v) => s + v, 0) / 4

  const bigThreePct = weekData.bigThreeCompleted / 3

  if (kpiAvg >= 0.7 && bigThreePct >= 0.66) return 'green'
  return 'yellow'
}

export function getStatusColors(status) {
  const map = {
    green: { hex: '#22c55e', bg: '#f0fdf4', text: '#15803d', label: 'בקצב' },
    yellow: { hex: '#eab308', bg: '#fefce8', text: '#854d0e', label: 'לעקוב' },
    red: { hex: '#ef4444', bg: '#fef2f2', text: '#b91c1c', label: 'מאחור' },
    gray: { hex: '#94a3b8', bg: '#f8fafc', text: '#64748b', label: 'חסר מידע' },
  }
  return map[status] || map.gray
}

export function getStatusLabel(status) {
  return getStatusColors(status).label
}

export function daysSinceUpdate(filledAt) {
  if (!filledAt) return Infinity
  return Math.floor((Date.now() - new Date(filledAt).getTime()) / (1000 * 60 * 60 * 24))
}
