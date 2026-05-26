import { getStatus, getStatusColors } from '../../utils/status.js'
import { formatValue, progressPercent } from '../../utils/formatters.js'
import ProgressBar from '../../components/ui/ProgressBar.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import WeeklyBarChart from '../../components/charts/WeeklyBarChart.jsx'
import { useData } from '../../hooks/useData.js'

export default function KPIDetailCard({ definition, kpi }) {
  const status = getStatus(kpi.actual, kpi.target)
  const colors = getStatusColors(status)
  const pct = progressPercent(kpi.actual, kpi.target)
  const delta = kpi.actual - kpi.target
  const trends = useData('kpis.weeklyTrends')
  const avgTarget = useData('kpis.monthlyTargetWeeklyAvg')

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">{definition.label}</span>
        <StatusBadge status={status} size="sm" />
      </div>

      <div className="flex items-end gap-4">
        <div>
          <div className="text-3xl font-bold text-slate-900">{formatValue(kpi.actual, kpi.unit)}</div>
          <div className="text-xs text-slate-400">of {formatValue(kpi.target, kpi.unit)} target</div>
        </div>
        <div className="mb-1 ml-auto text-right">
          <div className="text-sm font-bold" style={{ color: colors.hexText }}>{pct}%</div>
          <div className="text-xs" style={{ color: colors.hexText }}>
            {delta >= 0 ? '+' : ''}{formatValue(Math.abs(delta), kpi.unit)} {delta >= 0 ? 'ahead' : 'behind'}
          </div>
        </div>
      </div>

      <ProgressBar actual={kpi.actual} target={kpi.target} status={status} height="h-2.5" />

      <div className="pt-1">
        <div className="text-xs text-slate-500 mb-2 font-medium">4-Week Trend</div>
        <WeeklyBarChart
          data={trends}
          dataKey={definition.id}
          target={avgTarget[definition.id]}
          height={120}
        />
      </div>
    </div>
  )
}
