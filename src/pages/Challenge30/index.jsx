import { useState } from 'react'
import TopBar from '../../components/layout/TopBar.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'

// Temporary inline data until challenge.js is restructured
const CONTENT_DATA = Array.from({ length: 15 }, (_, i) => ({
  date: `2026-04-${String(i + 1).padStart(2, '0')}`,
  day: i + 1,
  completed: i < 12 ? (Math.random() > 0.2) : false,
}))

export default function Challenge30() {
  const totalDays = 30
  const data = CONTENT_DATA
  const completedDays = data.filter(d => d.completed).length
  const currentDay = data.length
  const completionPct = Math.round((completedDays / currentDay) * 100)
  const progressPct = Math.round((currentDay / totalDays) * 100)

  const status = completionPct >= 80 ? 'green' : completionPct >= 60 ? 'yellow' : 'red'

  const [todayDone, setTodayDone] = useState(false)

  return (
    <div>
      <TopBar title="אתגר תוכן — 30 יום" />
      <div className="px-4 md:px-6 py-4 space-y-4 max-w-2xl mx-auto">

        {/* Progress */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-slate-800">התקדמות 30 יום</h2>
            <StatusBadge status={status} />
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>יום {currentDay}/{totalDays}</span>
            <span>{progressPct}% מהזמן חלף</span>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="text-3xl font-black text-brand-600">{completedDays}</div>
            <div className="text-xs text-slate-500 mt-1">ימי תוכן</div>
          </Card>
          <Card className="p-3 text-center">
            <div className={`text-3xl font-black ${completionPct >= 80 ? 'text-green-600' : completionPct >= 60 ? 'text-amber-500' : 'text-red-400'}`}>
              {completionPct}%
            </div>
            <div className="text-xs text-slate-500 mt-1">עמידה</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-3xl font-black text-slate-400">{totalDays - currentDay}</div>
            <div className="text-xs text-slate-500 mt-1">ימים נותרו</div>
          </Card>
        </div>

        {/* Today */}
        <div
          className={`rounded-xl p-5 cursor-pointer transition-all duration-300 ${
            todayDone
              ? 'bg-green-500 text-white shadow-lg'
              : 'bg-white border-2 border-dashed border-brand-300 hover:border-brand-500'
          }`}
          onClick={() => setTodayDone(!todayDone)}
        >
          <div className="text-center">
            <div className={`text-lg font-bold mb-1 ${todayDone ? 'text-white' : 'text-slate-800'}`}>
              {todayDone ? '✔ פרסמת תוכן היום!' : 'פרסמת תוכן היום?'}
            </div>
            <div className={`text-sm ${todayDone ? 'text-green-100' : 'text-slate-400'}`}>
              {todayDone ? 'כל הכבוד! יום נוסף של עקביות' : 'לחץ כדי לסמן'}
            </div>
          </div>
        </div>

        {/* 30-day calendar */}
        <Card className="p-4">
          <h2 className="font-bold text-slate-800 mb-3">לוח 30 יום</h2>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: totalDays }, (_, i) => {
              const dayData = data[i]
              const isFuture = i >= currentDay
              const isToday = i === currentDay - 1
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-bold transition-all ${
                    isToday
                      ? todayDone
                        ? 'bg-green-500 text-white ring-2 ring-green-300'
                        : 'bg-brand-50 text-brand-600 ring-2 ring-brand-300'
                      : isFuture
                      ? 'bg-slate-50 text-slate-300'
                      : dayData?.completed
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-400'
                  }`}
                >
                  <span className="text-xs">{i + 1}</span>
                  {!isFuture && (
                    <span className="text-[10px]">
                      {(isToday ? todayDone : dayData?.completed) ? '✔' : '✖'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

      </div>
    </div>
  )
}
