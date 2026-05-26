/**
 * Exact scoring system from הפסגה documents:
 * Weekly Score = KPI×0.40 + BigThree×0.30 + Improvement×0.15 + Preservation×0.15
 */

export function calcWeeklyScore(weekData) {
  if (!weekData) return { score: 0, level: 0, components: {} }

  // KPI achievement — average of all 4 KPI % (capped at 100%)
  const kpiPcts = [
    weekData.targetsLeads ? Math.min(1, weekData.leads / weekData.targetsLeads) : 0,
    weekData.targetsCalls ? Math.min(1, weekData.calls / weekData.targetsCalls) : 0,
    weekData.targetsClosures ? Math.min(1, weekData.closures / weekData.targetsClosures) : 0,
    weekData.targetsRevenue ? Math.min(1, weekData.revenue / weekData.targetsRevenue) : 0,
  ]
  const kpiAvg = kpiPcts.reduce((s, v) => s + v, 0) / kpiPcts.length

  // Big 3 execution — 0, 1/3, 2/3, or 3/3
  const bigThreePct = weekData.bigThreeCompleted / 3

  // Improvement — days out of 7
  const improvementPct = (weekData.improvementDays || 0) / 7

  // Preservation — days out of 7
  const preservationPct = (weekData.preservationDays || 0) / 7

  // Weighted score (0-100)
  const score = Math.round(
    (kpiAvg * 40) +
    (bigThreePct * 30) +
    (improvementPct * 15) +
    (preservationPct * 15)
  )

  return {
    score,
    level: getScoreLevel(score),
    components: {
      kpi: Math.round(kpiAvg * 100),
      bigThree: Math.round(bigThreePct * 100),
      improvement: Math.round(improvementPct * 100),
      preservation: Math.round(preservationPct * 100),
    },
  }
}

export function getScoreLevel(score) {
  if (score >= 90) return 10
  if (score >= 80) return 9
  if (score >= 70) return 8
  if (score >= 60) return 7
  if (score >= 50) return 6
  if (score >= 40) return 5
  return Math.max(1, Math.floor(score / 10))
}

export function getScoreLevelRange(score) {
  if (score >= 90) return '9-10'
  if (score >= 70) return '7-8'
  if (score >= 50) return '5-6'
  return '1-4'
}
