import { getTimeBasedStatus, getStatusColors, getStatusLabel } from '../utils/status.js'
import { calcWeeklyScore } from '../utils/scoring.js'
import { useData } from './useData.js'

export function useWeeklyScore() {
  const latest = useData('raw.latest')
  return calcWeeklyScore(latest)
}

export function useKPIStatus(kpiId) {
  const latest = useData('raw.latest')
  const monthGoals = useData('goals.currentMonth')
  if (!latest || !monthGoals) return { status: 'gray', colors: null }

  const actualMap = { leads: latest.leads, calls: latest.calls, closures: latest.closures, revenue: latest.revenue }
  const targetMap = { leads: monthGoals.leadsTarget, calls: monthGoals.callsTarget, closures: monthGoals.closuresTarget, revenue: monthGoals.revenueTarget }

  // Cumulative: sum all weeks this month
  const allWeeks = useData('raw.allWeeks') || []
  const monthWeeks = allWeeks.filter(w => w.month === monthGoals.month && w.year === monthGoals.year)
  const cumulative = monthWeeks.reduce((sum, w) => sum + (w[kpiId] || 0), 0)

  const status = getTimeBasedStatus(cumulative, targetMap[kpiId])
  return { status, colors: getStatusColors(status), label: getStatusLabel(status), cumulative, target: targetMap[kpiId] }
}
