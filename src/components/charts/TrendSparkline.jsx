import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { getStatusColors } from '../../utils/status.js'

export default function TrendSparkline({ data, dataKey, status = 'green', height = 40 }) {
  const colors = getStatusColors(status)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={colors.hex}
          strokeWidth={2}
          dot={false}
        />
        <Tooltip
          contentStyle={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}
          labelFormatter={() => ''}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
