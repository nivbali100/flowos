import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import ProgressBar from '../../components/ui/ProgressBar.jsx'
import { formatCurrency, progressPercent, formatRelativeDate } from '../../utils/formatters.js'
import { getTimeBasedStatus, getStatusColors } from '../../utils/status.js'
import { calcWeeklyScore } from '../../utils/scoring.js'
import { calcSmartInsight, getInsightStyle } from '../../utils/insights.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import { useStore } from '../../hooks/useStore.js'
import { getFlowBrainState } from '../../utils/flowBrain.js'

// ─── Flow Brain Card (mirrored from Dashboard) ────────────────────────────────
const URGENCY_CONFIG = {
  high:   { bg: 'from-slate-900 via-red-950/80 to-slate-900',   ring: 'from-red-500/60 via-orange-500/40 to-red-500/60',   label: '🔴 דחוף' },
  medium: { bg: 'from-slate-900 via-brand-900/70 to-slate-900', ring: 'from-brand-500/50 via-purple-500/40 to-brand-500/50', label: '🟡 חשוב' },
  low:    { bg: 'from-slate-900 via-slate-800 to-slate-900',    ring: 'from-slate-600/40 via-slate-500/30 to-slate-600/40',   label: '🟢 הבא' },
}

function FlowBrainCard({ brain }) {
  const navigate = useNavigate()
  const { nextBestAction: action, identitySentence, modeLabel, modeEmoji } = brain
  const cfg = URGENCY_CONFIG[action.urgency] || URGENCY_CONFIG.low

  return (
    <div className="relative rounded-2xl p-[1.5px] overflow-hidden"
      style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}>
      <div className={`absolute inset-0 bg-gradient-to-r ${cfg.ring} animate-[spin_4s_linear_infinite] opacity-80`}
        style={{ borderRadius: 'inherit' }} />
      <div className={`relative rounded-2xl bg-gradient-to-br ${cfg.bg} p-4 shadow-xl overflow-hidden`}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }} />

        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-semibold text-white/50 leading-none truncate max-w-[60%]">
            {identitySentence}
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 shrink-0 border border-white/10">
            {modeEmoji} {modeLabel}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-4xl leading-none shrink-0 mt-0.5 drop-shadow-lg">{action.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-base font-black text-white leading-snug mb-1.5">{action.actionLabel}</div>
            <div className="text-sm text-white/70 leading-relaxed">{action.reason}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
          <span className="text-xs font-medium text-white/40">⏱ {action.estimatedTime}</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/10">
              {cfg.label}
            </span>
            {action.path && (
              <button
                onClick={() => navigate(action.path)}
                className="group text-[11px] font-black px-3 py-1 rounded-full bg-brand-500/40 hover:bg-brand-500/60 text-brand-200 hover:text-white transition-all duration-200 border border-brand-400/30 flex items-center gap-1"
              >
                צא לפעולה
                <span className="group-hover:translate-x-[-2px] transition-transform inline-block">←</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Weekly Retro History ─────────────────────────────────────────────────────
function RetroCard({ summary, isFirst }) {
  const pct = summary.completionPct || 0
  const big3ok = summary.big3Done >= Math.min(2, summary.big3Total)
  const pctColor = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-500' : 'text-red-500'
  const pctBg   = pct >= 70 ? 'bg-green-100' : pct >= 40 ? 'bg-amber-100' : 'bg-red-100'

  return (
    <div className="flex items-stretch gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center w-6 shrink-0">
        <div className={`w-3 h-3 rounded-full border-2 shrink-0 mt-1 ${isFirst ? 'border-brand-500 bg-brand-500' : 'border-slate-300 bg-white'}`} />
        <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
      </div>

      {/* Card body */}
      <div className="flex-1 pb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-800">{summary.weekLabel} · {summary.month}</span>
              <span className="text-[10px] text-slate-400 mr-2">
                {new Date(summary.savedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${pctBg} ${pctColor}`}>
                {summary.completedCount}/{summary.totalTasks} ✓
              </span>
              {big3ok && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">
                  ★ Big3
                </span>
              )}
            </div>
          </div>

          {/* Main win */}
          {summary.mainWin && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
              <span className="text-[10px] font-bold text-amber-600 block mb-0.5">🏆 ניצחון</span>
              <p className="text-xs text-slate-700 leading-snug">{summary.mainWin}</p>
            </div>
          )}

          {/* Retro: what worked + what to change */}
          {(summary.whatWorked || summary.whatChange) && (
            <div className="grid grid-cols-2 gap-2">
              {summary.whatWorked && (
                <div className="bg-green-50 rounded-lg px-2.5 py-2">
                  <span className="text-[10px] font-bold text-green-600 block mb-0.5">✅ עבד</span>
                  <p className="text-[11px] text-slate-600 leading-snug">{summary.whatWorked}</p>
                </div>
              )}
              {summary.whatChange && (
                <div className="bg-blue-50 rounded-lg px-2.5 py-2">
                  <span className="text-[10px] font-bold text-blue-600 block mb-0.5">🔄 לשנות</span>
                  <p className="text-[11px] text-slate-600 leading-snug">{summary.whatChange}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WeeklyRetroHistory() {
  const summaries = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('flowos_weekly_summaries') || '[]') }
    catch { return [] }
  }, [])

  if (summaries.length === 0) return (
    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-5 text-center">
      <p className="text-sm text-slate-400 font-medium">אין היסטוריה עדיין</p>
      <p className="text-xs text-slate-300 mt-1">כשתסגור שבוע — הרטרוספקטיבה תופיע כאן</p>
    </div>
  )

  return (
    <div className="pt-1">
      {summaries.map((s, i) => (
        <RetroCard key={s.savedAt} summary={s} isFirst={i === 0} />
      ))}
      {/* End dot */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center w-6 shrink-0">
          <div className="w-3 h-3 rounded-full border-2 border-slate-200 bg-white" />
        </div>
        <span className="text-[10px] text-slate-300">התחלה</span>
      </div>
    </div>
  )
}

export default function WeeklySection({ latest, previous, allWeeks, monthlyGoals }) {
  const period = usePeriod()
  const { tasks, monthly, quarterly, profile } = useStore()

  const brain = useMemo(
    () => getFlowBrainState({ profile, quarterly, monthly, tasks }),
    [profile, quarterly, monthly, tasks]
  )

  if (!latest) {
    return (
      <Card className="p-6 text-center text-slate-400">
        <div className="text-sm font-medium">אין נתוני שבוע</div>
        <div className="text-xs mt-1">ממלאים את הטופס השבועי כדי לראות כאן נתונים</div>
      </Card>
    )
  }

  const score = calcWeeklyScore(latest)
  const insight = calcSmartInsight(latest, allWeeks, score.score)
  const insightStyle = insight ? getInsightStyle(insight.type) : null

  // Cumulative monthly KPI
  const monthWeeks = allWeeks?.filter(w => w.month === period.month && w.year === period.year) || []
  const cumRevenue = monthWeeks.reduce((s, w) => s + (w.revenue || 0), 0)
  const cumLeads = monthWeeks.reduce((s, w) => s + (w.leads || 0), 0)
  const cumCalls = monthWeeks.reduce((s, w) => s + (w.calls || 0), 0)
  const cumClosures = monthWeeks.reduce((s, w) => s + (w.closures || 0), 0)

  const monthTarget = monthlyGoals || {}
  const cumulativeKpis = [
    { label: 'הכנסות', actual: cumRevenue, target: monthTarget.revenueTarget, isCurrency: true },
    { label: 'לידים', actual: cumLeads, target: monthTarget.leadsTarget },
    { label: 'שיחות', actual: cumCalls, target: monthTarget.callsTarget },
    { label: 'סגירות', actual: cumClosures, target: monthTarget.closuresTarget },
  ]

  // Weekly KPIs
  const weekKpis = [
    { label: 'לידים', actual: latest.leads, target: latest.targetsLeads },
    { label: 'שיחות', actual: latest.calls, target: latest.targetsCalls },
    { label: 'סגירות', actual: latest.closures, target: latest.targetsClosures },
    { label: 'הכנסות', actual: latest.revenue, target: latest.targetsRevenue, isCurrency: true },
  ]

  const bigThreeItems = latest.bigThree || []
  const bigThreeCompleted = latest.bigThreeCompleted || 0

  const mentalBars = [
    { label: 'אנרגיה', value: latest.energy || 0, color: '#3b82f6' },
    { label: 'מחויבות', value: latest.commitment || 0, color: '#8b5cf6' },
    { label: 'עומס', value: latest.load || 0, color: '#f59e0b' },
    { label: 'שליטה עצמית', value: latest.selfControl || 0, color: '#10b981' },
  ]

  const overallStatus = getTimeBasedStatus(latest.revenue || 0, latest.targetsRevenue || 0)
  const bannerColors = getStatusColors(overallStatus)

  // Coach zone calculations
  const mentalAvg = Math.round(((latest.energy || 0) + (latest.commitment || 0) + (latest.selfControl || 0)) / 3 * 10) / 10
  const consistency = score.components.improvement >= 70 && score.components.preservation >= 70 ? 'גבוהה' : score.components.improvement >= 40 ? 'בינונית' : 'נמוכה'
  const momentum = latest.revenue > (previous?.revenue || 0) ? 'עולה' : latest.revenue === (previous?.revenue || 0) ? 'יציב' : 'יורד'

  return (
    <div className="space-y-4">
      {/* Flow Brain Card — next best action */}
      <FlowBrainCard brain={brain} />

      {/* Status Banner */}
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: bannerColors.bg, color: bannerColors.text }}
      >
        <span className="font-bold text-sm">{period.weekLabel} — {period.month}</span>
        <StatusBadge status={overallStatus} />
      </div>

      {/* Smart Insight */}
      {insight && (
        <div className={`rounded-xl px-4 py-3 border flex items-start gap-3 ${insightStyle.bg} ${insightStyle.border}`}>
          <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: insightStyle.dot }} />
          <p className={`text-sm font-medium leading-relaxed ${insightStyle.text}`}>{insight.text}</p>
        </div>
      )}

      {/* Cumulative Monthly Progress */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 mb-3">התקדמות חודשית מצטברת</h3>
        <div className="grid grid-cols-2 gap-3">
          {cumulativeKpis.map((kpi) => {
            const status = getTimeBasedStatus(kpi.actual, kpi.target || 0)
            const pct = progressPercent(kpi.actual, kpi.target || 0)
            return (
              <div key={kpi.label} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                  <StatusBadge status={status} size="sm" />
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {kpi.isCurrency ? formatCurrency(kpi.actual) : kpi.actual}
                </div>
                <div className="text-xs text-slate-400 mb-1">
                  יעד: {kpi.isCurrency ? formatCurrency(kpi.target) : kpi.target} ({pct}%)
                </div>
                <ProgressBar actual={kpi.actual} target={kpi.target || 0} status={status} />
              </div>
            )
          })}
        </div>
      </Card>

      {/* Weekly KPIs */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 mb-3">ביצועי השבוע</h3>
        <div className="grid grid-cols-2 gap-3">
          {weekKpis.map((kpi) => {
            const status = getTimeBasedStatus(kpi.actual || 0, kpi.target || 0)
            return (
              <div key={kpi.label} className="bg-slate-50 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-slate-500">{kpi.label}</span>
                  <StatusBadge status={status} size="sm" />
                </div>
                <span className="text-base font-bold text-slate-800">
                  {kpi.isCurrency ? formatCurrency(kpi.actual || 0) : (kpi.actual || 0)}
                </span>
                <span className="text-xs text-slate-400"> / {kpi.isCurrency ? formatCurrency(kpi.target || 0) : (kpi.target || 0)}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Big 3 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">3 הגדולים</h3>
          <span className="text-xs font-bold text-slate-500">{bigThreeCompleted}/3</span>
        </div>
        <ul className="space-y-2">
          {bigThreeItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`text-base mt-0.5 ${i < bigThreeCompleted ? 'text-green-500' : 'text-slate-300'}`}>
                {i < bigThreeCompleted ? '✔' : '✖'}
              </span>
              <span className={`text-sm ${i < bigThreeCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Improvement + Preservation */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-700">שיפור</span>
            <span className="text-xs font-bold text-blue-600">{latest.improvementDays || 0}/7</span>
          </div>
          <p className="text-xs text-slate-500 mb-2 leading-relaxed">{latest.improvementCommitment}</p>
          <ProgressBar
            actual={latest.improvementDays || 0} target={7}
            status={latest.improvementDays >= 5 ? 'green' : latest.improvementDays >= 3 ? 'yellow' : 'red'}
          />
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-700">שימור</span>
            <span className="text-xs font-bold text-blue-600">{latest.preservationDays || 0}/7</span>
          </div>
          <p className="text-xs text-slate-500 mb-2 leading-relaxed">{latest.preservationCommitment}</p>
          <ProgressBar
            actual={latest.preservationDays || 0} target={7}
            status={latest.preservationDays >= 5 ? 'green' : latest.preservationDays >= 3 ? 'yellow' : 'red'}
          />
        </Card>
      </div>

      {/* Reflection */}
      <div className="border-t-2 border-slate-200 my-2" />

      <h3 className="font-bold text-slate-800 text-base">התבוננות שבועית</h3>

      {/* Biggest Win */}
      {latest.biggestWin && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4">
          <div className="text-xs font-semibold text-green-700 mb-1">ההישג הכי גדול</div>
          <p className="text-sm text-green-800 leading-relaxed">{latest.biggestWin}</p>
        </div>
      )}

      {/* What wasn't done + Why */}
      {latest.whatWasntDone && (
        <Card className="p-4">
          <div className="text-xs font-semibold text-red-600 mb-1">מה לא בוצע</div>
          <p className="text-sm text-slate-700 mb-3">{latest.whatWasntDone}</p>
          {latest.whyNot && (
            <>
              <div className="text-xs font-semibold text-amber-600 mb-1">למה</div>
              <p className="text-sm text-slate-700">{latest.whyNot}</p>
            </>
          )}
        </Card>
      )}

      {/* Most Important Next Week */}
      {latest.mostImportantNextWeek && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
          <div className="text-xs font-semibold text-blue-700 mb-1">הפעולה הכי חשובה לשבוע הבא</div>
          <p className="text-sm text-blue-800 font-medium leading-relaxed">{latest.mostImportantNextWeek}</p>
        </div>
      )}

      {/* Mental State */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 mb-3">מצב מנטלי</h3>
        <div className="space-y-3">
          {mentalBars.map((bar) => (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">{bar.label}</span>
                <span className="text-xs font-medium text-slate-600">{bar.value}/10</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${bar.value * 10}%`, backgroundColor: bar.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Coach Zone */}
      <Card className="p-4 bg-slate-50">
        <h3 className="font-bold text-slate-700 mb-3 text-sm">אזור בקרה למלווה</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">עקביות</div>
            <div className={`text-sm font-bold ${consistency === 'גבוהה' ? 'text-green-600' : consistency === 'בינונית' ? 'text-amber-500' : 'text-red-500'}`}>
              {consistency}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">בהירות</div>
            <div className="text-sm font-bold text-slate-700">{mentalAvg}/10</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">מומנטום</div>
            <div className={`text-sm font-bold ${momentum === 'עולה' ? 'text-green-600' : momentum === 'יציב' ? 'text-amber-500' : 'text-red-500'}`}>
              {momentum}
            </div>
          </div>
        </div>
      </Card>

      {/* Weekly Score */}
      <Card className="p-4 text-center">
        <div className="text-xs text-slate-400 mb-1">ציון שבועי</div>
        <div className="text-4xl font-black text-slate-900">{score.score}</div>
        <div className="text-xs text-slate-500 mt-1">רמה {score.level}/10</div>
      </Card>

      {/* Last update */}
      <div className="text-center text-xs text-slate-400 pb-2">
        עודכן: {formatRelativeDate(latest.filledAt)}
      </div>

      {/* ─── Retro History ─────────────────────────────────────────── */}
      <div className="border-t-2 border-slate-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-slate-800 text-base">לוג שבועי</h3>
          <span className="text-[10px] text-slate-400">מה עבד · מה לשנות · ניצחונות</span>
        </div>
        <WeeklyRetroHistory />
      </div>
    </div>
  )
}
