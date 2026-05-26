import { useState } from 'react'
import TopBar from '../../components/layout/TopBar.jsx'
import Card from '../../components/ui/Card.jsx'
import { useData } from '../../hooks/useData.js'
import { calcDaySuccessRate, calcCurrentStreak } from '../../data/challenge.js'

function StreakDisplay({ streak }) {
  const isFire = streak >= 3
  return (
    <Card className={`p-3 text-center ${isFire ? 'bg-orange-50 border border-orange-200' : ''}`}>
      <div className={`text-3xl font-black ${isFire ? 'text-orange-500' : 'text-indigo-600'}`}>
        {streak > 0 ? streak : '0'}
      </div>
      <div className={`text-xs mt-1 font-medium ${isFire ? 'text-orange-600' : 'text-slate-500'}`}>
        {isFire ? `🔥 סטריק` : 'סטריק'}
      </div>
    </Card>
  )
}

export default function Challenge90() {
  const config = useData('challenge.config')
  const data = useData('challenge.data')
  const habits = config?.habits || []

  const streak = calcCurrentStreak(data)
  const avgRate = data.length
    ? Math.round((data.reduce((s, d) => s + calcDaySuccessRate(d.results), 0) / data.length) * 100)
    : 0
  const totalDays = data.length
  const totalTarget = 90

  const lastWeek = data.slice(-7)

  const latestDay = data[data.length - 1]
  const [todayChecks, setTodayChecks] = useState(
    () => habits.map((_, i) => latestDay?.results?.[i] ?? false)
  )

  const toggleHabit = (i) => {
    setTodayChecks(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  const todayPct = habits.length > 0
    ? Math.round((todayChecks.filter(Boolean).length / habits.length) * 100)
    : 0

  const progressPct = Math.round((totalDays / totalTarget) * 100)

  return (
    <div>
      <TopBar title="אתגר הפסגה — 90 יום" />
      <div className="px-4 md:px-6 py-4 space-y-4 max-w-2xl mx-auto">

        {/* 90-day progress */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-slate-800">התקדמות 90 יום</h2>
            <span className="text-sm font-bold text-brand-600">יום {totalDays}/{totalTarget}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-700"
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 mt-1 text-center">{progressPct}% הושלם</div>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <StreakDisplay streak={streak} />
          <Card className="p-3 text-center">
            <div className={`text-3xl font-black ${avgRate >= 80 ? 'text-green-600' : avgRate >= 60 ? 'text-amber-500' : 'text-red-400'}`}>
              {avgRate}%
            </div>
            <div className="text-xs text-slate-500 mt-1">ממוצע</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-3xl font-black text-indigo-600">{totalDays}</div>
            <div className="text-xs text-slate-500 mt-1">ימים</div>
          </Card>
        </div>

        {/* 90-day calendar grid */}
        <Card className="p-4">
          <h2 className="font-bold text-slate-800 mb-3">לוח 90 יום</h2>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: totalTarget }, (_, i) => {
              const dayData = data[i]
              const pct = dayData ? Math.round(calcDaySuccessRate(dayData.results) * 100) : null
              const isFuture = i >= totalDays
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-sm flex items-center justify-center text-[9px] font-bold ${
                    isFuture
                      ? 'bg-slate-50 text-slate-300'
                      : pct === 100
                      ? 'bg-green-500 text-white'
                      : pct >= 70
                      ? 'bg-green-200 text-green-800'
                      : pct >= 40
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-red-200 text-red-800'
                  }`}
                  title={dayData ? `יום ${i + 1}: ${pct}%` : `יום ${i + 1}`}
                >
                  {i + 1}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Today's Habits */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800">ההרגלים של היום</h2>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
              todayPct === 100 ? 'bg-green-100 text-green-700' :
              todayPct >= 70 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {todayPct}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                todayPct === 100 ? 'bg-green-500' : todayPct >= 70 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${todayPct}%` }}
            />
          </div>
          <ul className="space-y-2">
            {habits.map((habit, i) => (
              <li
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => toggleHabit(i)}
              >
                <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-sm transition-colors ${
                  todayChecks[i]
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-slate-300 text-transparent'
                }`}>
                  ✔
                </span>
                <span className={`text-sm ${todayChecks[i] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {habit}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-center text-xs text-slate-400">
            {todayChecks.filter(Boolean).length}/{habits.length} הושלמו
          </div>
        </Card>

        {/* Week Grid */}
        <Card className="p-4 overflow-x-auto">
          <h2 className="font-bold text-slate-800 mb-3">7 ימים אחרונים</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-right text-xs text-slate-400 pb-2 pr-1 w-32">הרגל</th>
                {lastWeek.map((d) => (
                  <th key={d.date} className="text-center text-xs text-slate-400 pb-2 px-1">
                    {d.day.replace('יום ', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((habit, hIdx) => (
                <tr key={hIdx} className="border-t border-slate-100">
                  <td className="text-xs text-slate-600 py-1.5 pr-1 truncate max-w-[8rem]">{habit}</td>
                  {lastWeek.map((d) => {
                    const done = d.results?.[hIdx]
                    return (
                      <td key={d.date} className="text-center py-1.5 px-1">
                        <span className={`inline-block w-7 h-7 rounded-md text-sm leading-7 font-medium ${
                          done ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-300'
                        }`}>
                          {done ? '✔' : '·'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200">
                <td className="text-xs font-medium text-slate-500 py-1.5 pr-1">% יום</td>
                {lastWeek.map((d) => {
                  const pct = Math.round(calcDaySuccessRate(d.results) * 100)
                  return (
                    <td key={d.date} className="text-center py-1.5 px-1">
                      <span className={`text-xs font-bold ${pct === 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-500' : 'text-red-400'}`}>
                        {pct}%
                      </span>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </Card>

      </div>
    </div>
  )
}
