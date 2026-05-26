import { useState } from 'react'
import TopBar from '../../components/layout/TopBar.jsx'
import {
  BookOpen, Table2, CalendarDays,
  TrendingUp, TrendingDown, Minus,
  CheckCircle2,
  Star, AlertCircle, Zap, Users, Calendar, Shield
} from 'lucide-react'

// ─── Tool Card ──────────────────────────────────────────────────────────────
function ToolCard({ icon: Icon, title, subtitle, color, badge, points }) {
  return (
    <div className={`rounded-2xl p-5 border ${color.border} ${color.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.iconBg}`}>
          <Icon className={`w-5 h-5 ${color.iconText}`} />
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${color.badgeBg} ${color.badgeText}`}>
          {badge}
        </span>
      </div>
      <h3 className={`text-base font-black mb-1 ${color.title}`}>{title}</h3>
      <p className={`text-xs mb-3 ${color.sub}`}>{subtitle}</p>
      <ul className="space-y-1.5">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
            <span className={`mt-0.5 w-1 h-1 rounded-full flex-shrink-0 ${color.dot}`} />
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Timeline Step ───────────────────────────────────────────────────────────
function TimelineStep({ step, title, desc, color, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white ${color}`}>
          {step}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="font-bold text-slate-900 text-sm">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  )
}

// ─── Status Indicator Card ───────────────────────────────────────────────────
function StatusCard({ icon: Icon, title, color, desc, bg }) {
  return (
    <div className={`rounded-xl p-4 flex items-start gap-3 ${bg}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <div className="font-bold text-slate-800 text-sm">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  )
}

// ─── Rule Row ────────────────────────────────────────────────────────────────
function RuleRow({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <Icon className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-sm font-bold text-slate-800">{title}</div>
        {desc && <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</div>}
      </div>
    </div>
  )
}

// ─── Trait ──────────────────────────────────────────────────────────────────
function Trait({ text }) {
  return (
    <div className="flex items-center gap-2 text-sm text-white py-1.5">
      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      {text}
    </div>
  )
}

// ─── Section Heading ─────────────────────────────────────────────────────────
function SectionHeading({ label, title, sub }) {
  return (
    <div className="mb-4">
      <div className="inline-block text-[10px] font-black tracking-widest uppercase text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full mb-2">
        {label}
      </div>
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function GameRules() {
  return (
    <div>
      <TopBar title="כללי המשחק" />
      <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto space-y-10">

        {/* ── Hero ── */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700 p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black mb-2">כללי המשחק</h1>
          <p className="text-brand-100 text-sm leading-relaxed max-w-md mx-auto">
            איך עובדת מערכת הניהול בהפסגה — הכלים, הזרימה, וסטנדרט העבודה שמייצר תוצאות אמיתיות
          </p>
        </div>

        {/* ── 3 Tools ── */}
        <section>
          <SectionHeading
            label="כלי העבודה"
            title="שלושה כלים. זרימה אחת."
            sub="כל כלי ממלא תפקיד מדויק. ביחד הם יוצרים מערכת ניהול שלמה."
          />

          <div className="space-y-3">
            <ToolCard
              icon={BookOpen}
              badge="כלי החשיבה"
              title="יומן המסע"
              subtitle="כאן קובעים כיוון, בודקים התקדמות, ומנתחים תוצאות."
              color={{
                bg: 'bg-indigo-50', border: 'border-indigo-100',
                iconBg: 'bg-indigo-600', iconText: 'text-white',
                badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700',
                title: 'text-indigo-900', sub: 'text-indigo-600', dot: 'bg-indigo-400'
              }}
              points={[
                'קביעת כיוון אסטרטגי — שנתי, רבעוני, חודשי',
                'בדיקת התקדמות ויצירת לקחים',
                'ניתוח דפוסים — מה עובד ומה לא',
                'זיהוי פערים מוקדם לפני שהם מתרחבים',
                'לא מנהלים פה משימות — רק חושבים ומסיקים',
              ]}
            />

            <ToolCard
              icon={Table2}
              badge="כלי התכנון"
              title="קובץ היעדים"
              subtitle="מרכז התכנון העסקי ומעקב הביצוע בפועל."
              color={{
                bg: 'bg-emerald-50', border: 'border-emerald-100',
                iconBg: 'bg-emerald-600', iconText: 'text-white',
                badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700',
                title: 'text-emerald-900', sub: 'text-emerald-600', dot: 'bg-emerald-400'
              }}
              points={[
                'פירוק יעדים לשבועות ומשימות ספציפיות',
                'הגדרת יעדים חודשיים ושבועיים לכל תחום',
                'מעקב אחר מספרים אמיתיים',
                'ניתוח ביצועים ופיזור תשומות',
              ]}
            />

            <ToolCard
              icon={CalendarDays}
              badge="כלי הביצוע"
              title="ניהול שבועי — לוח המשימות"
              subtitle="כאן מתרחשת העבודה האמיתית בפועל, יום יום."
              color={{
                bg: 'bg-amber-50', border: 'border-amber-100',
                iconBg: 'bg-amber-500', iconText: 'text-white',
                badgeBg: 'bg-amber-100', badgeText: 'text-amber-700',
                title: 'text-amber-900', sub: 'text-amber-600', dot: 'bg-amber-400'
              }}
              points={[
                'לוח Kanban — 3 עמודות: רעיונות | היום | בוצע',
                'משימות נגזרות אוטומטית מהמהלכים הגדולים של החודש',
                'ניתוח AI לכל משימה — האם היא מניעה הכנסות?',
                'תעדוף לפי 20/80 — מה שמייצר את מרב התוצאות',
                'שיווק, תוכן, מכירות ויצירת הזדמנויות — ראשון תמיד',
              ]}
            />
          </div>
        </section>

        {/* ── Yearly Flow ── */}
        <section>
          <SectionHeading
            label="לוח הזמנים"
            title="הזרימה השנתית"
            sub="כך נראית שנה מלאה במערכת הפסגה"
          />

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <TimelineStep
              step="01"
              title="תחילת התהליך"
              desc="ממלאים נקודת פתיחה ויעד שנתי ביומן המסע — מצב העסק היום, מי אני כיזם, ולאן אני רוצה להגיע השנה."
              color="bg-brand-600"
            />
            <TimelineStep
              step="02"
              title="תחילת כל רבעון"
              desc="מגדירים יעדים רבעוניים ביומן המסע — הכנסות, לידים, שיחות, סגירות, 3 מהלכי מפתח והרגל מרכזי."
              color="bg-indigo-500"
            />
            <TimelineStep
              step="03"
              title="פירוק לחודשים"
              desc="מפרקים את הרבעון לחודשים ומשימות שבועיות בקובץ היעדים — מה בדיוק צריך לקרות כל שבוע."
              color="bg-emerald-500"
            />
            <TimelineStep
              step="04"
              title="ביצוע שוטף"
              desc="עובדים לפי Trello ויומן. הכלים מנהלים את הביצוע היומי. קובץ היעדים מנהל את התכנון."
              color="bg-amber-500"
            />
            <TimelineStep
              step="05"
              title="סיכום שבועי"
              desc="בסוף כל שבוע — סגירת שבוע ביומן המסע ובדיקת מספרים בקובץ היעדים. כל שבוע חייב להיסגר."
              color="bg-rose-500"
              isLast
            />
          </div>
        </section>

        {/* ── Indicators ── */}
        <section>
          <SectionHeading
            label="מדדי מעקב"
            title="מחוונים חודשיים ורבעוניים"
            sub="הכלים שעוזרים לך לראות את הכיוון לפני שהבעיה גדלה"
          />

          <div className="space-y-4">
            {/* Monthly Pace */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-sm font-black text-slate-800 mb-1">מד קצב חודשי</div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                לא מדובר בלחץ — אלא בזיהוי מוקדם ותיקון לפני שהחודש נגמר.
              </p>
              <div className="space-y-2">
                <StatusCard
                  icon={TrendingUp}
                  title="ירוק — על הקצב"
                  desc="הביצועים בפועל עומדים ביחס הנדרש לזמן שעבר החודש. ממשיכים בקו."
                  color="bg-green-500"
                  bg="bg-green-50"
                />
                <StatusCard
                  icon={Minus}
                  title="צהוב — פער קטן"
                  desc="יש פיגור קל. עדיין ניתן לסגור את הפער. כדאי לבדוק מה מחזיק ולהאיץ."
                  color="bg-amber-500"
                  bg="bg-amber-50"
                />
                <StatusCard
                  icon={TrendingDown}
                  title="אדום — פער משמעותי"
                  desc="הפיגור גדול ביחס לזמן שנותר. צריך פעולה מיידית: שינוי סדרי עדיפויות, שיחה עם המלווה."
                  color="bg-red-500"
                  bg="bg-red-50"
                />
              </div>
            </div>

            {/* Quarterly Momentum */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-sm font-black text-slate-800 mb-1">מד מומנטום רבעוני</div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                נועד להבין את כיוון העסק לאורך זמן — לא רק תוצאות חודש אחד.
              </p>
              <div className="space-y-2">
                <StatusCard
                  icon={TrendingUp}
                  title="מומנטום עולה"
                  desc="התוצאות השתפרו לאורך שלושת החודשים האחרונים. העסק בעלייה."
                  color="bg-green-500"
                  bg="bg-green-50"
                />
                <StatusCard
                  icon={Minus}
                  title="מומנטום יציב"
                  desc="התוצאות עקביות. לא נסיגה, אבל גם לא צמיחה. כדאי לשאול מה מונע פריצה."
                  color="bg-blue-500"
                  bg="bg-blue-50"
                />
                <StatusCard
                  icon={TrendingDown}
                  title="מומנטום יורד"
                  desc="תוצאות פוחתות לאורך זמן. זה הסימן לפגישת עומק עם המלווה ולשינוי אסטרטגי."
                  color="bg-red-500"
                  bg="bg-red-50"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Work Rules ── */}
        <section>
          <SectionHeading
            label="כללי עבודה"
            title="הסטנדרט של הפסגה"
            sub="כללים שמבטיחים שהתוצאות יגיעו"
          />

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <RuleRow
              icon={Shield}
              title="אחריות מלאה"
              desc="התוצאות הן שלך. לא של המלווה, לא של השוק. אתה מחזיק את הציפייה ועומד בדיבורך."
            />
            <RuleRow
              icon={BookOpen}
              title="מסמכים מעודכנים"
              desc="יומן המסע וקובץ היעדים חייבים להיות מעודכנים תמיד. מסמך שלא עודכן — לא ניתן לנהל ממנו."
            />
            <RuleRow
              icon={Table2}
              title="יומן מסע ≠ ניהול משימות"
              desc="יומן המסע הוא לחשיבה, כיוון ולמידה. ניהול משימות יומיומי שייך ללוח הניהול השבועי."
            />
            <RuleRow
              icon={Calendar}
              title="לוח שבועי = ביצוע"
              desc="כל משימה שתוכננה ביעדים חייבת להגיע ללוח הניהול השבועי לביצוע בפועל."
            />
            <RuleRow
              icon={CheckCircle2}
              title="כל שבוע נסגר"
              desc="בלי סגירת שבוע אין למידה. בלי למידה אין שיפור. סגירת שבוע היא לא אופציה."
            />
            <RuleRow
              icon={Users}
              title="חבר ממונה הוא חלק מהמערכת"
              desc="מפגש שבועי עם הבאדי הוא חלק ממנגנון האחריות. זה לא נחמד לעשות — זה הכרחי."
            />
            <RuleRow
              icon={AlertCircle}
              title="שאלות לניב / קבוצה / באדי"
              desc="כשנתקעים — שואלים. לא מחכים שבוע לפגישה. השאלה שלא נשאלה היא ההזדמנות שלא נוצלה."
            />
            <RuleRow
              icon={Zap}
              title="תקשורת עם ניב"
              desc="תקשורת ענינית, ממוקדת ומוכנה מראש. מגיעים לפגישה עם שאלות ברורות, לא רק עם בעיות."
            />
          </div>
        </section>

        {/* ── Winning Student ── */}
        <section>
          <SectionHeading
            label="סטנדרט אישי"
            title="איך נראה בוגר פסגה מצליח"
            sub="אלו לא ציפיות חיצוניות — זה מי שאתה בוחר להיות"
          />

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5">
            <div className="space-y-0.5">
              <Trait text="מעדכן מסמכים באופן קבוע — לא בלחץ של הגשה" />
              <Trait text="בודק נתונים, לא תחושות — מחליט לפי מספרים" />
              <Trait text="סוגר שבוע ומוציא לקחים — כל שבוע, ללא יוצא מן הכלל" />
              <Trait text="עובד מתוך תכנית, לא מתוך מצב רוח" />
              <Trait text="לוקח אחריות — מחפש פתרונות לפני שמחפש סיבות" />
              <Trait text="מתחבר לבאדי שבועית ועומד בהתחייבות" />
              <Trait text="עומד בדיבורו ומציב ציפיות ריאליות מעצמו" />
            </div>
          </div>
        </section>

        {/* ── Footer CTA ── */}
        <div className="rounded-2xl bg-brand-50 border border-brand-100 p-5 text-center">
          <Star className="w-6 h-6 text-brand-500 mx-auto mb-2" />
          <div className="text-sm font-black text-brand-900 mb-1">מוכן להתחיל?</div>
          <p className="text-xs text-brand-600">
            עכשיו שאתה מבין את הכללים — עבור לצעדי הפתיחה והשלם את משימות ההתחלה.
          </p>
        </div>

        <div className="h-4" />
      </div>
    </div>
  )
}
