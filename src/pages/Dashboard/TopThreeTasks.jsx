/**
 * TopThreeTasks — 3 הגדולים של השבוע
 * Premium: mission-critical visual, #1 task prominent, gradient numbers.
 */
import { Target } from 'lucide-react'
import { useData } from '../../hooks/useData.js'

const RANK_STYLE = [
  { bg: 'bg-gradient-to-br from-brand-500 to-purple-600', text: 'text-white', shadow: 'shadow-md shadow-brand-200' },
  { bg: 'bg-gradient-to-br from-slate-700 to-slate-800',  text: 'text-white', shadow: 'shadow-sm' },
  { bg: 'bg-slate-100',                                    text: 'text-slate-500', shadow: '' },
]

export default function TopThreeTasks() {
  const snapshot = useData('dashboard')
  const tasks = snapshot?.topThree || []
  const isEmpty = tasks.length === 0 || tasks.every(t => t.text === '—')

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🔥</span>
          <h2 className="text-sm font-black text-slate-800">3 הגדולים השבוע</h2>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
          מינוף גבוה
        </span>
      </div>

      {isEmpty ? (
        <div className="text-center py-8 px-4">
          <Target className="w-10 h-10 mx-auto mb-2.5 text-slate-200" />
          <div className="text-sm font-bold text-slate-400">לא הוגדרו 3 גדולים</div>
          <div className="text-xs text-slate-300 mt-1">ממלאים בטופס השבועי</div>
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {tasks.map((task, i) => {
            const rank = RANK_STYLE[i] || RANK_STYLE[2]
            const isFirst = i === 0
            const isUrgent = task.urgency === 'high'

            return (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
                  isFirst
                    ? 'bg-gradient-to-r from-brand-50/80 to-purple-50/40 border-brand-100/80'
                    : isUrgent
                    ? 'bg-red-50/60 border-red-100'
                    : 'bg-slate-50/60 border-slate-100/80'
                }`}
              >
                {/* Rank circle */}
                <span className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 leading-none ${rank.bg} ${rank.text} ${rank.shadow}`}>
                  {i + 1}
                </span>

                {/* Task text */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={`text-sm leading-snug ${
                    isFirst ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                  }`}>
                    {task.text}
                  </p>
                  {isFirst && (
                    <p className="text-[10px] text-brand-500 font-bold mt-0.5">★ עדיפות ראשונה</p>
                  )}
                </div>

                {/* Urgency indicator */}
                {isUrgent && (
                  <span className="text-sm shrink-0 mt-0.5">🔴</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
