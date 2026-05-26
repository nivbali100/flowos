import { useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import SectionHeader from '../../components/ui/SectionHeader.jsx'

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function TaskChecklist({ initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks)

  const toggle = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const doneCount = tasks.filter(t => t.done).length
  const total = tasks.length

  const byDay = DAY_ORDER.reduce((acc, day) => {
    const dayTasks = tasks.filter(t => t.day === day)
    if (dayTasks.length) acc[day] = dayTasks
    return acc
  }, {})

  return (
    <Card className="p-4">
      <SectionHeader
        title="Tasks"
        subtitle={`${doneCount} of ${total} complete`}
        className="mb-3"
      />
      {/* Progress */}
      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
        <div
          className="h-1.5 rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${(doneCount / total) * 100}%` }}
        />
      </div>

      {Object.entries(byDay).map(([day, dayTasks]) => (
        <div key={day} className="mb-4 last:mb-0">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{day}</div>
          <div className="space-y-1">
            {dayTasks.map(task => (
              <button
                key={task.id}
                onClick={() => toggle(task.id)}
                className="w-full flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                  task.done ? 'bg-brand-600 border-brand-600' : 'border-slate-300'
                }`}>
                  {task.done && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <span className={`text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {task.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </Card>
  )
}
