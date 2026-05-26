import { useData } from '../../hooks/useData.js'
import { getStatus } from '../../utils/status.js'
import { getStatusColors } from '../../utils/status.js'
import Card from '../../components/ui/Card.jsx'

export default function StatusSummary() {
  const kpis = useData('kpis.currentMonth')
  const counts = { green: 0, yellow: 0, red: 0 }
  kpis.forEach(k => counts[getStatus(k.actual, k.target)]++)

  const items = [
    { status: 'green', label: 'On Track', count: counts.green },
    { status: 'yellow', label: 'Watch', count: counts.yellow },
    { status: 'red', label: 'Behind', count: counts.red },
  ]

  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-slate-700 mb-3">April 2025 Status</div>
      <div className="flex gap-3">
        {items.map(({ status, label, count }) => {
          const colors = getStatusColors(status)
          return (
            <div key={status} className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: colors.hexBg }}>
              <div className="text-2xl font-bold" style={{ color: colors.hex }}>{count}</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: colors.hexText }}>{label}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
