import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getStatus, getStatusColors } from '../../utils/status.js'
import { formatValue, progressPercent } from '../../utils/formatters.js'
import ProgressBar from './ProgressBar.jsx'

export default function KPICard({ definition, kpi, expanded = false, trend = 'stable' }) {
  const status = getStatus(kpi.actual, kpi.target)
  const colors = getStatusColors(status)
  const pct = progressPercent(kpi.actual, kpi.target)
  const delta = kpi.actual - kpi.target

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-status-greenText' : trend === 'down' ? 'text-status-redText' : 'text-slate-400'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{definition.label}</span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: colors.hexBg, color: colors.hexText }}
        >
          {pct}%
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">
            {formatValue(kpi.actual, kpi.unit)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            of {formatValue(kpi.target, kpi.unit)}
          </div>
        </div>
        <TrendIcon className={`w-4 h-4 ${trendColor}`} />
      </div>

      <ProgressBar actual={kpi.actual} target={kpi.target} status={status} />

      {expanded && (
        <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
          <span className="text-slate-500">
            {delta >= 0 ? '+' : ''}{formatValue(Math.abs(delta), kpi.unit)} {delta >= 0 ? 'ahead' : 'behind'}
          </span>
          <span className="text-slate-400">{formatValue(kpi.target - kpi.actual, kpi.unit)} to go</span>
        </div>
      )}
    </div>
  )
}
