import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import { getStatusColors } from '../../utils/status.js'
import { progressPercent } from '../../utils/formatters.js'

export default function DonutProgress({ actual, target, status, size = 80, label }) {
  const pct = progressPercent(actual, target)
  const colors = getStatusColors(status)
  const data = [{ value: pct, fill: colors.hex }]

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%" cy="50%"
          innerRadius="70%" outerRadius="100%"
          startAngle={90} endAngle={-270}
          data={[{ value: 100, fill: '#f1f5f9' }, { value: pct, fill: colors.hex }]}
          barSize={8}
        >
          <RadialBar dataKey="value" cornerRadius={4} background={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold" style={{ color: colors.hexText }}>{pct}%</span>
        {label && <span className="text-[10px] text-slate-400">{label}</span>}
      </div>
    </div>
  )
}
