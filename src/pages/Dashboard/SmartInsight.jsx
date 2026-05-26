/**
 * SmartInsight — AI-driven insight card for the Dashboard.
 * Gradient header + clean insight text.
 */
import { Sparkles } from 'lucide-react'
import { useData } from '../../hooks/useData.js'
import { formatRelativeDate } from '../../utils/formatters.js'

export default function SmartInsight() {
  const snapshot = useData('dashboard')
  const { insight, lastUpdated } = snapshot || {}

  if (!insight) return null

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-indigo-100">
      {/* Gradient header bar */}
      <div className="bg-gradient-to-l from-brand-600 to-indigo-500 px-4 py-2.5 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
        <span className="text-xs font-black text-white uppercase tracking-wider flex-1">תובנה חכמה</span>
        {lastUpdated && (
          <span className="text-[10px] text-indigo-200">{formatRelativeDate(lastUpdated)}</span>
        )}
      </div>
      {/* Insight text */}
      <div className="bg-indigo-50 px-4 py-3.5">
        <p className="text-sm font-medium text-indigo-900 leading-relaxed">{insight}</p>
      </div>
    </div>
  )
}
