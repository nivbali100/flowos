import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip, Cell } from 'recharts'
import { getStatus, getStatusColors } from '../../utils/status.js'

export default function WeeklyBarChart({ data, dataKey, target, height = 160 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="weekLabel"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
        />
        {target && (
          <ReferenceLine
            y={target}
            stroke="#94a3b8"
            strokeDasharray="4 2"
            label={{ value: 'Target', position: 'right', fontSize: 10, fill: '#94a3b8' }}
          />
        )}
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => {
            const status = getStatus(entry[dataKey], target || entry[dataKey])
            const colors = getStatusColors(target ? status : 'green')
            return <Cell key={index} fill={colors.hex} opacity={0.85} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
