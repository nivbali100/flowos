/**
 * Performance — weekly score breakdown + monthly KPI progress + trend chart
 */
import TopBar from '../../components/layout/TopBar.jsx'
import Card from '../../components/ui/Card.jsx'
import ProgressBar from '../../components/ui/ProgressBar.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { useData } from '../../hooks/useData.js'
import { useStore } from '../../hooks/useStore.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import { calcWeeklyScore } from '../../utils/scoring.js'
import { getTimeBasedStatus, getStatusColors } from '../../utils/status.js'
import { formatCurrency, progressPercent } from '../../utils/formatters.js'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from 'recharts'
import { SCORE_COMPONENTS } from '../../constants/app.js'

const KPI_DEFS = [
  { key: 'leads',    label: 'לידים',   targetKey: 'leadsTarget',    fmt: v => v,               emoji: '🎯' },
  { key: 'calls',    label: 'שיחות',   targetKey: 'callsTarget',    fmt: v => v,               emoji: '📞' },
  { key: 'closures', label: 'סגירות',  targetKey: 'closuresTarget', fmt: v => v,               emoji: '🤝' },
  { key: 'revenue',  label: 'הכנסות',  targetKey: 'revenueTarget',  fmt: formatCurrency,       emoji: '💰' },
]

function ScoreCircle({ score, level }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const pct = score / 100
  const dashOffset = circumference * (1 - pct)

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={radius} strokeWidth="8" fill="none" stroke="#f1f5f9" />
        <circle
          cx="56" cy="56" r={radius}
          strokeWidth="8" fill="none"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-black tabular-nums leading-none" style={{ color }}>{score}</div>
        <div className="text-xs text-slate-400 mt-0.5">רמה {level}/10</div>
      </div>
    </div>
  )
}

export default function Performance() {
  const latest   = useData('raw.latest')
  const allWeeks = useData('raw.allWeeks')
  const period   = usePeriod()
  const { monthly } = useStore()

  if (!latest) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <div className="text-center">
        <div className="text-4xl mb-3">📊</div>
        <div className="font-medium">אין נתונים עדיין</div>
        <div className="text-sm mt-1">ממלאים את הטופס השבועי כדי לראות ביצועים</div>
      </div>
    </div>
  )

  const { score, level, components } = calcWeeklyScore(latest)

  // Use real current month from usePeriod — not seed data month name
  const currentMonth = period.month
  const monthWeeks   = (allWeeks || []).filter(w => w.month === currentMonth)

  // KPI actuals: prefer real user data from monthly.actualKPIs, fall back to seed data sums
  const seedCumulative = {}
  KPI_DEFS.forEach(({ key }) => {
    seedCumulative[key] = monthWeeks.reduce((sum, w) => sum + (w[key] || 0), 0)
  })
  const actuals = monthly?.actualKPIs || {}
  const cumulative = {
    revenue:  actuals.revenue  ?? seedCumulative.revenue  ?? 0,
    leads:    actuals.leads    ?? seedCumulative.leads    ?? 0,
    calls:    actuals.calls    ?? seedCumulative.calls    ?? 0,
    closures: actuals.closures ?? seedCumulative.closures ?? 0,
  }

  // Goals/targets: prefer what user set in Goals page (useStore monthly), fall back to seed
  const goals = {
    revenueTarget:  monthly?.revenueTarget  || latest?.targetsRevenue  || 0,
    leadsTarget:    monthly?.leadsTarget    || latest?.targetsLeads    || 0,
    callsTarget:    monthly?.callsTarget    || latest?.targetsCalls    || 0,
    closuresTarget: monthly?.closuresTarget || latest?.targetsClosures || 0,
  }

  // Status summary
  const statuses    = KPI_DEFS.map(({ key, targetKey }) => getTimeBasedStatus(cumulative[key], goals?.[targetKey] || 0))
  const greenCount  = statuses.filter(s => s === 'green').length
  const yellowCount = statuses.filter(s => s === 'yellow').length
  const redCount    = statuses.filter(s => s === 'red').length

  // Revenue trend chart — all available weeks
  const chartData = (allWeeks || []).slice(-6).map(w => ({
    name:    `ש${w.week}`,
    revenue: w.revenue || 0,
    target:  w.targetsRevenue || 0,
  }))

  const avgRevenue = chartData.length > 0
    ? Math.round(chartData.reduce((s, w) => s + w.revenue, 0) / chartData.length)
    : 0

  const scoreLabel =
    score >= 80 ? '🏆 שבוע מעולה' :
    score >= 60 ? '📈 על המסלול' :
    score >= 40 ? '⚠️ יש מקום לשיפור' : '🔴 שבוע קשה'

  return (
    <div dir="rtl">
      <TopBar title="ביצועים" />
      <div className="px-4 md:px-6 py-4 space-y-4 max-w-2xl mx-auto">

        {/* ── Score Hero ── */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5">
          <div className="flex items-center gap-5">
            <ScoreCircle score={score} level={level} />
            <div className="flex-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">ציון שבועי</div>
              <div className="text-base font-bold text-white mb-3">{scoreLabel}</div>
              <div className="space-y-2">
                {SCORE_COMPONENTS.map(c => (
                  <div key={c.key} className="flex items-center gap-2">
                    <span className="text-sm w-5">{c.emoji}</span>
                    <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${components[c.key]}%`, backgroundColor: c.color }}
                      />
                    </div>
                    <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color: c.color }}>
                      {components[c.key]}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Status Summary ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { count: greenCount,  label: 'בקצב',   status: 'green',  emoji: '✅' },
            { count: yellowCount, label: 'לעקוב',  status: 'yellow', emoji: '⚠️' },
            { count: redCount,    label: 'מאחור',  status: 'red',    emoji: '🔴' },
          ].map(({ count, label, status, emoji }) => {
            const colors = getStatusColors(status)
            return (
              <div
                key={status}
                className="rounded-2xl p-4 text-center border"
                style={{ backgroundColor: colors.bg, borderColor: `${colors.hex}30` }}
              >
                <div className="text-2xl mb-0.5">{emoji}</div>
                <div className="text-3xl font-black" style={{ color: colors.hex }}>{count}</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: colors.text }}>{label}</div>
              </div>
            )
          })}
        </div>

        {/* ── Monthly KPI Progress ── */}
        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-2">התקדמות חודשית — {currentMonth}</h2>
          <div className="space-y-3">
            {KPI_DEFS.map(({ key, label, targetKey, fmt, emoji }) => {
              const actual = cumulative[key]
              const target = goals?.[targetKey] || 0
              const status = getTimeBasedStatus(actual, target)
              const pct    = progressPercent(actual, target)
              return (
                <Card key={key} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{emoji}</span>
                    <span className="text-sm font-bold text-slate-700 flex-1">{label}</span>
                    <StatusBadge status={status} size="sm" />
                  </div>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <span className="text-2xl font-black text-slate-900 tabular-nums">{fmt(actual)}</span>
                    <span className="text-sm text-slate-400">/ {fmt(target)}</span>
                    <span className="text-sm font-bold text-slate-500 mr-auto">{pct}%</span>
                  </div>
                  <ProgressBar actual={actual} target={target} status={status} height="h-2.5" />
                </Card>
              )
            })}
          </div>
        </section>

        {/* ── Revenue Trend Chart ── */}
        {chartData.length > 0 && (
          <Card className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-800">מגמת הכנסות שבועית</h2>
                <p className="text-xs text-slate-400 mt-0.5">ממוצע: {formatCurrency(avgRevenue)} לשבוע</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'Heebo' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v) => [formatCurrency(v), 'הכנסות']}
                  labelStyle={{ fontFamily: 'Heebo', direction: 'rtl' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <ReferenceLine y={avgRevenue} stroke="#cbd5e1" strokeDasharray="4 4" />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === chartData.length - 1 ? '#6366f1' : '#e2e8f0'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-brand-500" />
                <span className="text-xs text-slate-500">השבוע הנוכחי</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <span className="text-xs text-slate-500">שבועות קודמים</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 bg-slate-300 border-dashed" style={{ borderTop: '1px dashed #cbd5e1' }} />
                <span className="text-xs text-slate-500">ממוצע</span>
              </div>
            </div>
          </Card>
        )}

        {/* ── Week-by-week breakdown ── */}
        {monthWeeks.length > 0 && (
          <Card className="p-4">
            <h2 className="font-bold text-slate-800 mb-3">פירוט שבועי — {currentMonth}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ direction: 'rtl' }}>
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="text-right pb-2 font-semibold">שבוע</th>
                    <th className="text-center pb-2 font-semibold">הכנסות</th>
                    <th className="text-center pb-2 font-semibold">לידים</th>
                    <th className="text-center pb-2 font-semibold">שיחות</th>
                    <th className="text-center pb-2 font-semibold">סגירות</th>
                    <th className="text-center pb-2 font-semibold">ציון</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {monthWeeks.map(w => {
                    const { score: ws } = calcWeeklyScore(w)
                    const wsColor = ws >= 80 ? 'text-green-600' : ws >= 60 ? 'text-amber-600' : 'text-red-500'
                    return (
                      <tr key={w.week} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-bold text-slate-700">ש{w.week}</td>
                        <td className="py-2.5 text-center font-semibold tabular-nums">{formatCurrency(w.revenue || 0)}</td>
                        <td className="py-2.5 text-center text-slate-600 tabular-nums">{w.leads || 0}</td>
                        <td className="py-2.5 text-center text-slate-600 tabular-nums">{w.calls || 0}</td>
                        <td className="py-2.5 text-center text-slate-600 tabular-nums">{w.closures || 0}</td>
                        <td className={`py-2.5 text-center font-black tabular-nums ${wsColor}`}>{ws}</td>
                      </tr>
                    )
                  })}
                  {/* Totals row */}
                  <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                    <td className="py-2.5 text-xs text-slate-500 font-bold">סה"כ</td>
                    <td className="py-2.5 text-center tabular-nums">{formatCurrency(cumulative.revenue)}</td>
                    <td className="py-2.5 text-center tabular-nums">{cumulative.leads}</td>
                    <td className="py-2.5 text-center tabular-nums">{cumulative.calls}</td>
                    <td className="py-2.5 text-center tabular-nums">{cumulative.closures}</td>
                    <td className="py-2.5 text-center text-slate-400">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
