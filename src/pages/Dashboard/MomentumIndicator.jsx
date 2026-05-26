/**
 * MomentumIndicator — premium circular gauge with dynamic background.
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useData } from '../../hooks/useData.js'

function CircleGauge({ score, color, glowColor }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(1, Math.max(0, score / 10))
  const dashOffset = circumference * (1 - pct)

  return (
    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
      {/* Glow layer */}
      <div
        className="absolute inset-2 rounded-full blur-md opacity-20 transition-all duration-700"
        style={{ backgroundColor: glowColor }}
      />
      <svg className="absolute inset-0 -rotate-90" width="112" height="112" viewBox="0 0 112 112">
        {/* Track */}
        <circle cx="56" cy="56" r={radius} strokeWidth="8" fill="none" stroke="rgba(0,0,0,0.06)" />
        {/* Progress */}
        <circle
          cx="56" cy="56" r={radius}
          strokeWidth="8"
          fill="none"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div className="text-center z-10 relative">
        <div className="text-3xl font-black tabular-nums leading-none" style={{ color }}>
          {score.toFixed(1)}
        </div>
        <div className="text-[10px] text-slate-400 leading-none mt-0.5 font-semibold">/10</div>
      </div>
    </div>
  )
}

export default function MomentumIndicator() {
  const latest   = useData('raw.latest')
  const snapshot = useData('dashboard')
  const { momentumScore = 0, momentumTrend = 'stable' } = snapshot || {}

  if (!latest) return null

  const TrendIcon  = momentumTrend === 'up' ? TrendingUp : momentumTrend === 'down' ? TrendingDown : Minus
  const trendColor = momentumTrend === 'up' ? '#22c55e' : momentumTrend === 'down' ? '#ef4444' : '#94a3b8'
  const trendLabel = momentumTrend === 'up' ? '↑ עולה' : momentumTrend === 'down' ? '↓ יורד' : '→ יציב'
  const trendBg    = momentumTrend === 'up' ? 'bg-green-50 border-green-100 text-green-700' : momentumTrend === 'down' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-500'

  const score     = momentumScore
  const color     = score >= 7 ? '#22c55e' : score >= 5 ? '#f59e0b' : '#ef4444'
  const glowColor = score >= 7 ? '#22c55e' : score >= 5 ? '#f59e0b' : '#ef4444'
  const level     = score >= 7 ? 'מומנטום חזק 💪' : score >= 5 ? 'מומנטום בינוני' : 'מומנטום חלש'
  const levelColor= score >= 7 ? 'text-green-700' : score >= 5 ? 'text-amber-600' : 'text-red-600'

  const zones = [
    { label: 'נמוך',   range: '0–4', active: score < 5,               color: '#ef4444', bar: 'from-red-400 to-red-500'   },
    { label: 'בינוני', range: '5–6', active: score >= 5 && score < 7, color: '#f59e0b', bar: 'from-amber-400 to-amber-500'},
    { label: 'גבוה',   range: '7–10',active: score >= 7,              color: '#22c55e', bar: 'from-emerald-400 to-green-500'},
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
        <h2 className="text-sm font-black text-slate-800">מומנטום שבועי</h2>
        <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${trendBg}`}>
          <TrendIcon className="w-3 h-3" />
          {trendLabel}
        </div>
      </div>

      <div className="p-4 flex items-center gap-5">
        <CircleGauge score={score} color={color} glowColor={glowColor} />

        <div className="flex-1 space-y-1">
          <div className={`text-sm font-black mb-3 ${levelColor}`}>{level}</div>
          {zones.map(({ label, range, active, color: zoneColor, bar }) => (
            <div key={label} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 ${active ? 'bg-slate-50 border border-slate-100' : ''}`}>
              <div className={`w-8 h-1.5 rounded-full bg-gradient-to-r ${active ? bar : ''} ${!active ? 'bg-slate-100' : ''} shrink-0 transition-all`} />
              <span className={`text-xs font-bold ${active ? 'text-slate-800' : 'text-slate-300'}`}>{label}</span>
              <span className={`text-[10px] mr-auto font-mono ${active ? 'text-slate-400' : 'text-slate-200'}`}>{range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
