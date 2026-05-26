/**
 * PressureBanner — shows the single highest-priority pressure message.
 * Level 3 = 🚨 solid red  (direct/3-day escalation)
 * Level 2 = 🔴 strong red (stuck / behind / 2-day)
 * Level 1 = ⚠  amber      (gentle nudge)
 *
 * Props:
 *   tasks    Task[]    — current task list
 *   onMove?  fn(id, status) — optional action handler
 */
import { computePressure } from '../../utils/pressure.js'

const LEVEL_STYLE = {
  3: { wrap: 'bg-red-600 border-red-700',   text: 'text-white', btn: 'bg-white/20 hover:bg-white/30 text-white' },
  2: { wrap: 'bg-red-500 border-red-600',   text: 'text-white', btn: 'bg-white/20 hover:bg-white/30 text-white' },
  1: { wrap: 'bg-amber-500 border-amber-600', text: 'text-white', btn: 'bg-white/20 hover:bg-white/30 text-white' },
}

export default function PressureBanner({ tasks, onMove }) {
  const msg = computePressure(tasks)
  if (!msg) return null

  const s = LEVEL_STYLE[msg.level] || LEVEL_STYLE[1]

  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${s.wrap}`}>
      <div className={`font-black text-sm ${s.text}`}>{msg.title}</div>
      <div className={`text-sm mt-0.5 leading-relaxed ${s.text} opacity-90`}>{msg.body}</div>
      {msg.actionLabel && msg.taskId && onMove && (
        <button
          onClick={() => onMove(msg.taskId, 'today')}
          className={`mt-2.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 transition-colors ${s.btn}`}
        >
          {msg.actionLabel} →
        </button>
      )}
    </div>
  )
}
