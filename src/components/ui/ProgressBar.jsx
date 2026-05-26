import { getStatusColors } from '../../utils/status.js'
import { progressPercent } from '../../utils/formatters.js'

export default function ProgressBar({ actual, target, status, height = 'h-2', showLabel = false }) {
  const pct = progressPercent(actual, target)
  const colors = getStatusColors(status)
  return (
    <div className="w-full">
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${height}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: colors.hex }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-500">{pct}% complete</span>
          <span className="text-xs text-slate-400">{target} target</span>
        </div>
      )}
    </div>
  )
}
