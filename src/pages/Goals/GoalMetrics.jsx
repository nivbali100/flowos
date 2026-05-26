import { getStatus } from '../../utils/status.js'
import { formatValue, progressPercent } from '../../utils/formatters.js'
import ProgressBar from '../../components/ui/ProgressBar.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { useData } from '../../hooks/useData.js'

function MetricRow({ label, actual, target, unit }) {
  const status = getStatus(actual, target)
  const pct = progressPercent(actual, target)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-900">{formatValue(actual, unit)}</span>
          <span className="text-xs text-slate-400">/ {formatValue(target, unit)}</span>
          <StatusBadge status={status} label={`${pct}%`} size="sm" />
        </div>
      </div>
      <ProgressBar actual={actual} target={target} status={status} />
    </div>
  )
}

export function AnnualMetrics() {
  const goals = useData('goals.annual')
  const { targets: t, actuals: a } = goals
  return (
    <div className="space-y-4">
      <MetricRow label="Revenue" actual={a.revenue} target={t.revenue} unit="currency" />
      <MetricRow label="New Leads" actual={a.leads} target={t.leads} unit="count" />
      <MetricRow label="Discovery Calls" actual={a.meetings} target={t.meetings} unit="count" />
      <MetricRow label="Closed Deals" actual={a.sales} target={t.sales} unit="count" />
    </div>
  )
}

export function QuarterMetrics({ quarter }) {
  const quarterlyGoals = useData('goals.quarterly')
  const q = quarterlyGoals.find(g => g.quarter === quarter)
  if (!q) return null
  const { targets: t, actuals: a } = q
  return (
    <div className="space-y-4">
      <MetricRow label="Revenue" actual={a.revenue} target={t.revenue} unit="currency" />
      <MetricRow label="New Leads" actual={a.leads} target={t.leads} unit="count" />
      <MetricRow label="Discovery Calls" actual={a.meetings} target={t.meetings} unit="count" />
      <MetricRow label="Closed Deals" actual={a.sales} target={t.sales} unit="count" />
    </div>
  )
}

export function MonthlyMetrics() {
  const monthlyGoals = useData('goals.monthly')
  const current = monthlyGoals.find(m => m.status === 'active') || monthlyGoals[0]
  const { targets: t, actuals: a } = current
  return (
    <div className="space-y-4">
      <MetricRow label="Revenue" actual={a.revenue} target={t.revenue} unit="currency" />
      <MetricRow label="New Leads" actual={a.leads} target={t.leads} unit="count" />
      <MetricRow label="Discovery Calls" actual={a.meetings} target={t.meetings} unit="count" />
      <MetricRow label="Closed Deals" actual={a.sales} target={t.sales} unit="count" />
    </div>
  )
}
