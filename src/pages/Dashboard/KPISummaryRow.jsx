/**
 * KPISummaryRow — 4 KPI cards in a 2×2 grid.
 * Premium redesign: colored accent bar, animated progress, trend indicators.
 */
import { useData } from '../../hooks/useData.js'
import { useStore } from '../../hooks/useStore.js'
import { getTimeBasedStatus } from '../../utils/status.js'
import { formatCurrency, progressPercent } from '../../utils/formatters.js'

const KPI_META = {
  leads:    { emoji: '🎯', label: 'לידים',  color: '#6366f1', bar: 'from-indigo-400 to-brand-500',  bg: 'from-indigo-50 to-white'  },
  calls:    { emoji: '📞', label: 'שיחות',  color: '#3b82f6', bar: 'from-blue-400 to-blue-500',     bg: 'from-blue-50 to-white'    },
  closures: { emoji: '🤝', label: 'סגירות', color: '#10b981', bar: 'from-emerald-400 to-green-500', bg: 'from-emerald-50 to-white' },
  revenue:  { emoji: '💰', label: 'הכנסות', color: '#f59e0b', bar: 'from-amber-400 to-orange-400',  bg: 'from-amber-50 to-white',  isCurrency: true },
}

const STATUS_DOT = {
  green:  'bg-green-400',
  yellow: 'bg-amber-400',
  red:    'bg-red-400',
}

function KPICard({ id, meta, actual, target, status, pct, isEmpty }) {
  const dotColor = STATUS_DOT[status] || 'bg-slate-300'
  const isGood = status === 'green'
  const isBad  = status === 'red'

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
      {/* Colored accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${meta.bar}`} />

      <div className="p-3.5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-lg leading-none">{meta.emoji}</span>
            <span className="text-xs font-bold text-slate-500">{meta.label}</span>
          </div>
          {!isEmpty && (
            <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${isGood ? 'animate-pulse' : ''}`} />
          )}
        </div>

        {/* Main number */}
        <div className={`text-2xl font-black tabular-nums leading-none mb-0.5 ${
          isEmpty ? 'text-slate-200' : isBad ? 'text-red-600' : isGood ? 'text-slate-900' : 'text-slate-800'
        }`}>
          {isEmpty ? '—' : meta.isCurrency ? formatCurrency(actual) : actual}
        </div>

        {/* Target row */}
        <div className="flex items-center gap-1 mb-2.5">
          <span className="text-[10px] text-slate-400">
            יעד: {target ? (meta.isCurrency ? formatCurrency(target) : target) : 'לא הוגדר'}
          </span>
          {!isEmpty && target && (
            <span className={`text-[10px] font-black mr-auto ${
              isGood ? 'text-green-600' : isBad ? 'text-red-500' : 'text-amber-600'
            }`}>
              {pct}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          {!isEmpty && (
            <div
              className={`h-full rounded-full bg-gradient-to-r ${meta.bar} transition-all duration-700`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default function KPISummaryRow() {
  const latest   = useData('raw.latest')
  const snapshot = useData('dashboard')
  const { monthly } = useStore()

  if (!latest) {
    const targets = {
      leads:    monthly?.leadsTarget    || null,
      calls:    monthly?.callsTarget    || null,
      closures: monthly?.closuresTarget || null,
      revenue:  monthly?.revenueTarget  || null,
    }
    return (
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(KPI_META).map(([id, meta]) => (
          <KPICard
            key={id} id={id} meta={meta}
            actual={0} target={targets[id]}
            status="grey" pct={0} isEmpty
          />
        ))}
      </div>
    )
  }

  const kpis = snapshot?.kpis || []

  return (
    <div className="grid grid-cols-2 gap-3">
      {kpis.map(kpi => {
        const status = getTimeBasedStatus(kpi.actual, kpi.target)
        const pct    = progressPercent(kpi.actual, kpi.target)
        const meta   = KPI_META[kpi.id] || { emoji: '📊', bar: 'from-slate-300 to-slate-400', isCurrency: false }
        return (
          <KPICard
            key={kpi.id} id={kpi.id}
            meta={{ ...meta, label: kpi.label }}
            actual={kpi.actual} target={kpi.target}
            status={status} pct={pct}
          />
        )
      })}
    </div>
  )
}
