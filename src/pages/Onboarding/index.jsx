import { useState, useEffect } from 'react'
import TopBar from '../../components/layout/TopBar.jsx'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  Play, Users, Download, Copy, UserCheck,
  Mail, MessageSquare, Info, Lock, Unlock
} from 'lucide-react'

// ─── Task data ─────────────────────────────────────────────────────────────
const TASKS = [
  {
    id: 'watch-platform',
    icon: Play,
    title: 'צפה בהדרכת הפלטפורמה',
    badge: 'שלב ראשון',
    badgeColor: 'bg-brand-100 text-brand-700',
    what: 'צפה בסרטוני ההדרכה ב-Drive: היכרות עם יומן המסע, הפסגה כמתודולוגיה, וכיצד משתמשים בפלטפורמה נכון.',
    why: 'בלי להבין את הכלים, לא ניתן להשתמש בהם נכון. ההדרכה נותנת בסיס שמונע בלבול ואיבוד זמן בהמשך.',
    how: 'כנס ל-Drive שנשלח אליך, צפה בסדר — יומן המסע קודם, אחר כך מדריך הפסגה. אחרי כל סרטון תרשום שאלה אחת שעלתה לך.',
    links: [],
  },
  {
    id: 'enter-academy',
    icon: Lock,
    title: 'כנס לאקדמיה',
    badge: 'גישה',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    what: 'כניסה לפלטפורמת האקדמיה שבה נמצאים כל החומרים, ההקלטות, והסשנים של הפסגה.',
    why: 'האקדמיה היא הספרייה המקצועית שלך לכל תקופת הפסגה. כל מה שנלמד נשמר שם.',
    how: 'קיבלת לינק וקוד גישה במייל ההצטרפות. כנס, בדוק שאתה רואה את כל המודולים, וסמן את הסשן הראשון.',
    links: [],
  },
  {
    id: 'open-weekly-board',
    icon: Unlock,
    title: 'פתח את לוח הניהול השבועי',
    badge: 'כלים',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    what: 'כניסה ללוח הניהול השבועי של הפלטפורמה — כאן תנהל את כל המשימות שלך בסגנון Kanban.',
    why: 'לוח הניהול הוא כלי הביצוע היומי שלך. בלעדיו, המשימות שתכנן לא יגיעו לביצוע בפועל.',
    how: 'לחץ על "ניהול שבועי" בניווט, הוסף 3 משימות ראשונות מהיעדים שלך, וסמן את 3 הגדולים לשבוע.',
    links: [],
  },
  {
    id: 'copy-files',
    icon: Copy,
    title: 'העתק פרוטוקול ותיקיות לתיקיה אישית',
    badge: 'ארגון',
    badgeColor: 'bg-amber-100 text-amber-700',
    what: 'העתקת תבנית קובץ היעדים ופרוטוקול העבודה לתיקיית Drive האישית שלך כדי שתוכל לעדכן ולשתף.',
    why: 'מסמך שמנוהל במרחב ציבורי לא יתעדכן. כשיש לך תיקייה אישית — הכל מאורגן, ניתן לשיתוף עם המלווה ועם הבאדי.',
    how: 'פתח את ה-Drive המשותף של הפסגה, לחץ "עשה עותק" על תבנית קובץ היעדים, ושמור בתיקייה שלך. שתף עם ניב.',
    links: [],
  },
  {
    id: 'connect-buddy',
    icon: Users,
    title: 'התחבר לבאדי וקבע פגישה שבועית',
    badge: 'אחריות',
    badgeColor: 'bg-rose-100 text-rose-700',
    what: 'יצירת קשר ראשוני עם חבר הלמידה שלך (באדי), והגדרת פגישה שבועית קבועה ביניכם.',
    why: 'מחקרים מראים שאחריות הדדית מעלה בצורה דרמטית את שיעור ההשלמה של התחייבויות. הבאדי הוא אחד הכלים הכי חזקים בתהליך.',
    how: 'שלח הודעה ראשונה, הציג את עצמך, ותאם יום ושעה קבועים לשיחה שבועית של 20-30 דקות. עדיף אותו זמן כל שבוע.',
    links: [],
  },
  {
    id: 'fill-questionnaire',
    icon: UserCheck,
    title: 'כנס לפלטפורמה ומלא שאלון אישיות',
    badge: 'פרופיל',
    badgeColor: 'bg-purple-100 text-purple-700',
    what: 'כניסה לפלטפורמת ניב בכתובת המייל שסופקה, ומילוי שאלון אישיות שעוזר להכיר את אופן הלמידה והעבודה שלך.',
    why: 'השאלון עוזר לניב ולצוות להבין מי אתה כיזם, מה הקשיים שלך ואיך הכי טוב ללוות אותך. זה משפר את הפגישות משמעותית.',
    how: 'כנס למייל שקיבלת, פתח את קישור הפלטפורמה, הירשם עם הכתובת המייל שלך, ומלא את השאלון בצורה כנה וכמה שיותר מפורטת.',
    links: [],
  },
  {
    id: 'meet-nivos',
    icon: MessageSquare,
    title: 'הקדש 30 דקות להכיר את Nivos',
    badge: 'כלי AI',
    badgeColor: 'bg-cyan-100 text-cyan-700',
    what: 'שיחה ראשונה עם Nivos — עוזר ה-AI של הפסגה — לבניית בסיס עבודה ומנטלי לתחילת הדרך.',
    why: 'Nivos הוא כלי שמחמיץ רוב האנשים בהתחלה כי לא מבינים איך להשתמש בו נכון. 30 דקות ראשונות טובות יוצרות הרגל שמשפר כל שבוע.',
    how: 'פתח שיחה עם Nivos, ספר לו על העסק שלך, על הקשיים, ועל המטרות. בקש ממנו לעזור לך לנסח את נקודת הפתיחה. הקשב לתגובות.',
    links: [],
  },
]

// ─── Storage helpers ──────────────────────────────────────────────────────
function loadCompleted() {
  try {
    return JSON.parse(localStorage.getItem('onboarding_completed') || '[]')
  } catch { return [] }
}
function saveCompleted(ids) {
  localStorage.setItem('onboarding_completed', JSON.stringify(ids))
}

// ─── Single Task Card ────────────────────────────────────────────────────
function TaskCard({ task, isCompleted, onToggle, index }) {
  const [open, setOpen] = useState(false)
  const Icon = task.icon

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      isCompleted
        ? 'border-green-200 bg-green-50'
        : 'border-slate-200 bg-white'
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        {/* Step number / check */}
        <button
          onClick={() => onToggle(task.id)}
          className="flex-shrink-0 focus:outline-none"
          aria-label={isCompleted ? 'סמן כלא הושלם' : 'סמן כהושלם'}
        >
          {isCompleted
            ? <CheckCircle2 className="w-6 h-6 text-green-500" />
            : <Circle className="w-6 h-6 text-slate-300 hover:text-brand-400 transition-colors" />
          }
        </button>

        {/* Icon + content */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isCompleted ? 'bg-green-100' : 'bg-slate-100'
        }`}>
          <Icon className={`w-4 h-4 ${isCompleted ? 'text-green-600' : 'text-slate-500'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {task.title}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.badgeColor}`}>
              {task.badge}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">שלב {index + 1} מתוך {TASKS.length}</div>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label={open ? 'סגור' : 'פתח פרטים'}
        >
          {open
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
          }
        </button>
      </div>

      {/* Expandable body */}
      {open && (
        <div className="px-4 pb-5 border-t border-slate-100 bg-slate-50 space-y-4">
          <div className="pt-4 space-y-3">
            {/* What */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Info className="w-3.5 h-3.5 text-brand-500" />
                <span className="text-xs font-black text-brand-700 uppercase tracking-wide">מה זה</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{task.what}</p>
            </div>

            {/* Why */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs font-black text-indigo-700 uppercase tracking-wide">💡 למה זה חשוב</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{task.why}</p>
            </div>

            {/* How */}
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <div className="text-xs font-black text-emerald-700 mb-1.5 uppercase tracking-wide">✅ איך עושים את זה</div>
              <p className="text-sm text-slate-700 leading-relaxed">{task.how}</p>
            </div>

            {/* CTA button */}
            <button
              onClick={() => onToggle(task.id)}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                isCompleted
                  ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              {isCompleted ? '↩ סמן כלא הושלם' : '✓ סמן כהושלם'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Progress Ring ────────────────────────────────────────────────────────
function ProgressRing({ pct }) {
  const r = 20
  const circumference = 2 * Math.PI * r
  const dash = (pct / 100) * circumference
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <circle
        cx="26" cy="26" r={r}
        fill="none"
        stroke={pct === 100 ? '#22c55e' : '#6366f1'}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const [completed, setCompleted] = useState(loadCompleted)

  function toggleTask(id) {
    setCompleted(prev => {
      const next = prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
      saveCompleted(next)
      return next
    })
  }

  const count = completed.length
  const total = TASKS.length
  const pct = Math.round((count / total) * 100)
  const allDone = count === total

  return (
    <div>
      <TopBar title="צעדי פתיחה" />
      <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto space-y-6">

        {/* ── Progress Header ── */}
        <div className={`rounded-2xl p-5 ${
          allDone
            ? 'bg-gradient-to-br from-green-600 to-emerald-700 text-white'
            : 'bg-gradient-to-br from-brand-700 to-indigo-700 text-white'
        }`}>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <ProgressRing pct={pct} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-black text-white">{pct}%</span>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black">
                {allDone ? '🎉 סיימת את כל השלבים!' : `${count} מתוך ${total} שלבים הושלמו`}
              </h2>
              <p className="text-sm opacity-80 mt-0.5">
                {allDone
                  ? 'כל הכבוד! עכשיו אתה מוכן לתחילת התהליך המלא.'
                  : 'השלם את כל המשימות לפני הפגישה הראשונה עם המלווה.'}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {!allDone && (
            <div className="mt-4">
              <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Context note ── */}
        {!allDone && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <span className="text-lg flex-shrink-0">⚡</span>
            <div>
              <div className="text-sm font-bold text-amber-800">לפני הפגישה הראשונה</div>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                השלם את כל הצעדים לפני פגישת הפתיחה עם ניב. זה מה שמבטיח שהפגישה תהיה אפקטיבית ולא בסיסית.
              </p>
            </div>
          </div>
        )}

        {/* ── Task List ── */}
        <div className="space-y-3">
          {TASKS.map((task, idx) => (
            <TaskCard
              key={task.id}
              task={task}
              index={idx}
              isCompleted={completed.includes(task.id)}
              onToggle={toggleTask}
            />
          ))}
        </div>

        {/* ── Done state ── */}
        {allDone && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-5 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="font-black text-green-800 text-base mb-1">מוכן לצאת לדרך</div>
            <p className="text-sm text-green-600">
              כל השלבים הראשוניים הושלמו. עכשיו — יומן מסע ונקודת פתיחה.
            </p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
