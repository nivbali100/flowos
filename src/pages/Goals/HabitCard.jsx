import { Activity } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
// Simulate some done days
const DONE_DAYS = [0, 1, 3] // Mon, Tue, Thu done this week

export default function HabitCard({ habit }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-brand-500" />
        <span className="text-sm font-semibold text-slate-800">Key Habit</span>
      </div>
      <p className="text-sm text-slate-700 mb-3">{habit}</p>
      <div className="flex gap-1.5">
        {DAYS.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold ${
                DONE_DAYS.includes(i)
                  ? 'bg-status-green text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {DONE_DAYS.includes(i) ? '✓' : ''}
            </div>
            <span className="text-[10px] text-slate-400">{day}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
