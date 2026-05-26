import { usePeriod } from '../../hooks/usePeriod.js'

export default function PeriodBreadcrumb() {
  const { year, quarter, month, weekLabel } = usePeriod()
  return (
    <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
      <span>{year}</span>
      <span className="text-slate-300">‹</span>
      <span>{quarter}</span>
      <span className="text-slate-300">‹</span>
      <span>{month}</span>
      <span className="text-slate-300">‹</span>
      <span className="text-brand-600">{weekLabel}</span>
    </div>
  )
}
