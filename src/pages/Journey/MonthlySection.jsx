/**
 * MonthlySection — section ד in Journey
 * All fields editable via EditableField + useStore.
 * Includes live realism check vs starting point and quarterly target.
 */
import Card from '../../components/ui/Card.jsx'
import EditableField from '../../components/ui/EditableField.jsx'
import { useStore } from '../../hooks/useStore.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import { formatCurrency } from '../../utils/formatters.js'

// ─── Monthly Realism Engine ───────────────────────────────────────────────────
function computeMonthlyRealismIssues(m, profile, quarterly) {
  const issues = []
  const sp = profile?.startingPoint || {}
  const baseMonthly  = sp.avgMonthlyRevenue || 0
  const closingRate  = (sp.closingRate || 0) / 100
  const qRevenue     = quarterly?.revenueTarget || 0

  const mRevenue   = m.revenueTarget  || 0
  const mLeads     = m.leadsTarget    || 0
  const mCalls     = m.callsTarget    || 0
  const mClosures  = m.closuresTarget || 0

  // 1. Monthly revenue vs baseline
  if (baseMonthly > 0 && mRevenue > 0) {
    const growthX = mRevenue / baseMonthly
    if (growthX >= 5) {
      issues.push({ level: 'red',
        msg: `יעד ההכנסות (${formatCurrency(mRevenue)}) גבוה פי ${growthX.toFixed(1)} מהכנסתך החודשית הממוצעת (${formatCurrency(baseMonthly)}). קפיצה כזו בחודש אחד — בדוק שהיעד ריאלי.` })
    } else if (growthX >= 3) {
      issues.push({ level: 'amber',
        msg: `יעד חודשי גבוה פי ${growthX.toFixed(1)} מהבסיס. אפשרי — אבל נדרש שינוי אסטרטגי, לא רק עוד מאמץ.` })
    }
  }

  // 2. Monthly revenue vs quarterly target (should be roughly 1/3)
  if (qRevenue > 0 && mRevenue > 0) {
    const ratio = mRevenue / (qRevenue / 3)
    if (ratio > 1.6) {
      issues.push({ level: 'amber',
        msg: `יעד חודשי (${formatCurrency(mRevenue)}) גבוה ב-${Math.round(ratio * 100 - 100)}% מהצפוי לפי הרבעון (${formatCurrency(Math.round(qRevenue / 3))} לחודש). שקול לעדכן את אחד משניהם.` })
    }
  }

  // 3. Calls > Leads — logically impossible
  if (mLeads > 0 && mCalls > 0 && mCalls > mLeads * 1.2) {
    issues.push({ level: 'red',
      msg: `יעד שיחות (${mCalls}) חורג מיעד לידים (${mLeads}). לא ניתן לקיים יותר שיחות מכירה ממה שיש לידים.` })
  }

  // 4. Closures vs closing rate
  if (mCalls > 0 && mClosures > 0 && closingRate > 0) {
    const expectedClosures = Math.round(mCalls * closingRate)
    if (mClosures > expectedClosures * 1.5) {
      issues.push({ level: 'amber',
        msg: `לפי אחוז הסגירה שלך (${sp.closingRate}%), מ-${mCalls} שיחות צפויות ~${expectedClosures} סגירות — אבל הגדרת ${mClosures}. עדכן אחד מהשניים.` })
    }
  }

  return issues
}

function RealismBanner({ issues }) {
  if (!issues.length) return null
  const topLevel = issues.some(i => i.level === 'red') ? 'red' : 'amber'
  const bg   = topLevel === 'red' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
  const head = topLevel === 'red' ? 'text-red-700' : 'text-amber-700'
  const body = topLevel === 'red' ? 'text-red-600' : 'text-amber-700'
  const icon = topLevel === 'red' ? '🚨' : '⚠️'
  return (
    <div className={`rounded-xl border p-3.5 space-y-2 ${bg}`}>
      <p className={`text-xs font-black uppercase tracking-wide ${head}`}>{icon} בדיקת ריאליות</p>
      {issues.map((issue, i) => (
        <p key={i} className={`text-xs leading-relaxed ${body}`}>{issue.msg}</p>
      ))}
    </div>
  )
}

export default function MonthlySection() {
  const { monthly, updateMonthly, updateMonthlyMove, profile, quarterly } = useStore()
  const period = usePeriod()
  const m = monthly || {}

  const hasMonthEnd      = m.monthEndActualRevenue != null
  const realismIssues    = computeMonthlyRealismIssues(m, profile, quarterly)

  return (
    <div className="space-y-4">
      {/* Period badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
          {m.month || period.month} {m.year || period.year}
        </span>
      </div>

      {/* KPI Targets */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 mb-4">יעדי חודש</h3>
        <div className="grid grid-cols-2 gap-4">
          <EditableField
            label="הכנסות"
            hint="יעד ההכנסות לחודש זה. בדוק שהוא עולה בקנה אחד עם היעד הרבעוני. אם חודש שעבר היה חלש — אל תפצה בחודש הנוכחי עם יעד בלתי ריאלי."
            type="currency"
            value={m.revenueTarget}
            formatDisplay={v => formatCurrency(v)}
            onSave={v => updateMonthly('revenueTarget', v)}
          />
          <EditableField
            label="לידים"
            hint="כמה לידים חדשים אתה מניח לקבל / לייצר החודש? חשב מהיסטוריה — לא מאופטימיות."
            type="number"
            value={m.leadsTarget}
            onSave={v => updateMonthly('leadsTarget', v)}
          />
          <EditableField
            label="שיחות"
            hint="כמה שיחות מכירה מתוכננות החודש? כולל שיחות שכבר תואמו וכאלו שתייצר."
            type="number"
            value={m.callsTarget}
            onSave={v => updateMonthly('callsTarget', v)}
          />
          <EditableField
            label="סגירות"
            hint="כמה עסקאות חדשות יש לסגור החודש? יעד זה הוא הKPI הכי ישיר להכנסות."
            type="number"
            value={m.closuresTarget}
            onSave={v => updateMonthly('closuresTarget', v)}
          />
        </div>
        {realismIssues.length > 0 && (
          <div className="mt-4"><RealismBanner issues={realismIssues} /></div>
        )}
      </Card>

      {/* 3 Key Moves */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 mb-1">3 המהלכים הגדולים</h3>
        <p className="text-xs text-slate-400 mb-4">מה ה-3 פעולות שאם תגמור אותן החודש הזה — המספרים ישתנו?</p>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-brand-500 font-black text-lg shrink-0 leading-none mt-2">{i + 1}</span>
              <div className="flex-1">
                <EditableField
                  label={`מהלך ${i + 1}`}
                  hint={
                    i === 0
                      ? 'הפעולה הכי ישירה שמניעה הכנסות החודש. לדוגמה: "לסגור 3 לקוחות חדשים לתכנית הדגל".'
                      : i === 1
                      ? 'פעולה שיווקית / תוכן שתייצר לידים. לדוגמה: "להשיק וובינר עם 50 נרשמים".'
                      : 'פעולה של בניית תשתית. לדוגמה: "לגמור לכתוב את נוהל הצ׳ק-אין ולאמן עליו את הצוות".'
                  }
                  type="textarea"
                  value={(m.threeKeyMoves || [])[i] || ''}
                  onSave={v => updateMonthlyMove(i, v)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Habit + What Could Fail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4">
          <EditableField
            label="ההרגל שאני מחזק"
            hint="ההרגל היומי שתשמור עליו החודש. כתוב בדיוק מתי ואיך. לדוגמה: 'שיחת מכירה אחת מדי בוקר לפני 10:00 לפחות 3 ימים בשבוע'."
            type="textarea"
            value={m.habit}
            onSave={v => updateMonthly('habit', v)}
          />
        </Card>
        <Card className="p-4">
          <EditableField
            label="מה עלול להפיל אותי"
            hint="מה הסיכון הספציפי לחודש זה? אירוע משפחתי? עומס פרויקטים? חגים? כתוב את זה — ותכנן מראש כיצד לא לאבד מומנטום."
            type="textarea"
            value={m.whatCouldFail}
            onSave={v => updateMonthly('whatCouldFail', v)}
          />
        </Card>
      </div>

      {/* Mental Entry */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
        <EditableField
          label="כניסה מנטלית לחודש"
          hint="איך אתה נכנס לחודש הזה? מה ההתחייבות האחת שלך לעצמך? כתוב כאנרגיה — זה מה שתקרא בכל ראשון של השבוע כדי להתכוון מחדש."
          type="textarea"
          value={m.mentalEntry}
          onSave={v => updateMonthly('mentalEntry', v)}
        />
      </div>

      {/* Month-End Analysis */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 mb-3">סיכום חודש</h3>
        {hasMonthEnd ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <EditableField
                label="הכנסות בפועל"
                hint="כמה הכנסת בפועל החודש? כולל כל התשלומים שנכנסו."
                type="currency"
                value={m.monthEndActualRevenue}
                formatDisplay={v => formatCurrency(v)}
                onSave={v => updateMonthly('monthEndActualRevenue', v)}
              />
              <EditableField
                label="לידים בפועל"
                hint="כמה לידים רלוונטיים קיבלת בפועל החודש?"
                type="number"
                value={m.monthEndActualLeads}
                onSave={v => updateMonthly('monthEndActualLeads', v)}
              />
            </div>
            <EditableField
              label="מה עבד"
              hint="מה הפעולה / ההחלטה שנתנה את התוצאות הכי טובות החודש?"
              type="textarea"
              value={m.monthEndWhatWorked}
              onSave={v => updateMonthly('monthEndWhatWorked', v)}
            />
            <EditableField
              label="מה לא עבד"
              hint="מה בזבז זמן / אנרגיה מבלי לתת תוצאות?"
              type="textarea"
              value={m.monthEndWhatDidnt}
              onSave={v => updateMonthly('monthEndWhatDidnt', v)}
            />
            <EditableField
              label="איזה דפוס חזר"
              hint="מה הדפוס שראית שוב החודש שחזר מחודשים קודמים? הכרה בלבד היא לא מספיק — כתוב מה אתה עושה אחרת."
              type="textarea"
              value={m.monthEndPatternRepeated}
              onSave={v => updateMonthly('monthEndPatternRepeated', v)}
            />
            <EditableField
              label="מה אני עושה אחרת"
              hint="מה ההחלטה האחת שאתה מביא לחודש הבא על בסיס הלמידה מהחודש הזה?"
              type="textarea"
              value={m.monthEndWhatToDoDifferently}
              onSave={v => updateMonthly('monthEndWhatToDoDifferently', v)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4 text-slate-400">
              <div className="text-sm font-medium mb-1">סיכום חודש — למלא בסוף החודש</div>
              <div className="text-xs">כשמגיע הזמן, לחץ "ערוך" ומלא את הנתונים</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <EditableField
                label="הכנסות בפועל"
                type="currency"
                value={m.monthEndActualRevenue}
                formatDisplay={v => formatCurrency(v)}
                onSave={v => updateMonthly('monthEndActualRevenue', v)}
              />
              <EditableField
                label="לידים בפועל"
                type="number"
                value={m.monthEndActualLeads}
                onSave={v => updateMonthly('monthEndActualLeads', v)}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
