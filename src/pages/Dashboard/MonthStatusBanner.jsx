/**
 * MonthStatusBanner — hero card showing monthly performance status.
 * Shows status pill, message, % of month elapsed, and a progress bar.
 * Shows a "waiting" state when no real weekly data exists.
 */
import { getStatusColors } from '../../utils/status.js'
import { useData } from '../../hooks/useData.js'
import { usePeriod } from '../../hooks/usePeriod.js'

const STATUS_EMOJI = { green: '✅', yellow: '⚠️', red: '🚨', gray: '📊' }
const STATUS_LABEL = { green: 'על הקצב', yellow: 'לעקוב', red: 'מאחור', gray: 'חסר מידע' }

export default function MonthStatusBanner() {
  const latest   = useData('raw.latest')
  const snapshot = useData('dashboard')
  const period   = usePeriod()
  const { monthStatus = 'gray', statusMessage = '', month = '' } = snapshot || {}
  const colors = getStatusColors(monthStatus)

  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfMonth  = today.getDate()
  const monthPct    = Math.round((dayOfMonth / daysInMonth) * 100)

  const label = STATUS_LABEL[monthStatus] || STATUS_LABEL.gray
  const emoji = STATUS_EMOJI[monthStatus] || STATUS_EMOJI.gray

  // ── No data yet: show month progress only (no false status) ───────────────
  if (!latest) {
    const grayHex = '#94a3b8'
    return (
      <div className="rounded-2xl p-5 bg-slate-50 border border-slate-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-200 text-slate-600">
                📊 {period.month}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-400 leading-snug">
              ממתין לנתונים ראשונים — מלא את הטופס השבועי להפעלת הניתוח
            </p>
          </div>
          <div className="text-left shrink-0 text-center">
            <div className="text-3xl font-black leading-none text-slate-400">
              {monthPct}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">מהחודש עבר</div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-200">
            <div
              className="h-full rounded-full transition-all duration-700 bg-slate-400"
              style={{ width: `${monthPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>יום 1</span>
            <span>יום {dayOfMonth}</span>
            <span>יום {daysInMonth}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: colors.bg, border: `1px solid ${colors.hex}30` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{ backgroundColor: colors.hex, color: '#fff' }}
            >
              {emoji} {label}
            </span>
            <span className="text-sm font-semibold" style={{ color: colors.text }}>{month}</span>
          </div>
          <p className="text-base font-bold text-slate-800 leading-snug">{statusMessage}</p>
        </div>
        <div className="text-left shrink-0 text-center">
          <div className="text-3xl font-black leading-none" style={{ color: colors.hex }}>
            {monthPct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">מהחודש עבר</div>
        </div>
      </div>

      {/* Month progress bar */}
      <div className="space-y-1">
        <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: `${colors.hex}20` }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${monthPct}%`, backgroundColor: colors.hex }}
          />
        </div>
        <div className="flex justify-between text-[10px]" style={{ color: colors.text }}>
          <span>יום 1</span>
          <span>יום {dayOfMonth}</span>
          <span>יום {daysInMonth}</span>
        </div>
      </div>
    </div>
  )
}
