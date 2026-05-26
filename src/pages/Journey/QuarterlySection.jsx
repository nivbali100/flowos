/**
 * QuarterlySection — section ג in Journey
 * All fields editable via EditableField + useStore.
 * Includes a realism-check banner that flags unrealistic or inconsistent targets.
 */
import Card from '../../components/ui/Card.jsx'
import EditableField from '../../components/ui/EditableField.jsx'
import { useStore } from '../../hooks/useStore.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import { formatCurrency } from '../../utils/formatters.js'

// ─── Realism Check Engine ─────────────────────────────────────────────────────
function computeRealismIssues(q, profile) {
  const issues = []
  const sp = profile?.startingPoint || {}
  const annualTarget = profile?.annualGoals?.revenueTarget || 0

  const baseMonthly = sp.avgMonthlyRevenue || 0
  const baseQuarterly = baseMonthly * 3
  const qRevenue = q.revenueTarget || 0
  const qLeads = q.leadsTarget || 0
  const qCalls = q.callsTarget || 0
  const qClosures = q.closuresTarget || 0
  const closingRate = (sp.closingRate || 0) / 100  // e.g. 0.3 for 30%

  // 1. Revenue jump too high vs baseline
  if (baseQuarterly > 0 && qRevenue > 0) {
    const growthX = qRevenue / baseQuarterly
    if (growthX >= 4) {
      issues.push({
        level: 'red',
        msg: `יעד ההכנסות (${formatCurrency(qRevenue)}) גבוה פי ${growthX.toFixed(1)} מהבסיס (${formatCurrency(baseQuarterly)}). `
          + `קפיצה כזו ברבעון אחד נדירה מאוד — בדוק שהיעד ריאלי או חלק ל-2 שלבים.`,
      })
    } else if (growthX >= 2.5) {
      issues.push({
        level: 'amber',
        msg: `יעד ההכנסות גבוה פי ${growthX.toFixed(1)} מהבסיס שלך. אפשרי — אבל תצטרך שינוי אסטרטגי משמעותי, לא רק עבודה קשה יותר.`,
      })
    }
  }

  // 2. Revenue inconsistent with annual goal
  if (annualTarget > 0 && qRevenue > 0) {
    const impliedAnnual = qRevenue * 4
    const ratio = impliedAnnual / annualTarget
    if (ratio > 1.4) {
      issues.push({
        level: 'amber',
        msg: `הרבעון הזה לבד מרמז על ${formatCurrency(impliedAnnual)} לשנה — ${Math.round(ratio * 100 - 100)}% מעל היעד השנתי שלך (${formatCurrency(annualTarget)}). שקול לעדכן את הרבעון או את היעד השנתי.`,
      })
    }
  }

  // 3. Calls > Leads (logically impossible)
  if (qLeads > 0 && qCalls > 0 && qCalls > qLeads * 1.2) {
    issues.push({
      level: 'red',
      msg: `יעד שיחות (${qCalls}) גבוה מיעד לידים (${qLeads}). לא ניתן לקיים יותר שיחות מכירה ממה שיש לידים — תיקון נדרש.`,
    })
  }

  // 4. Closures vs calls + closing rate
  if (qCalls > 0 && qClosures > 0 && closingRate > 0) {
    const expectedClosures = Math.round(qCalls * closingRate)
    if (qClosures > expectedClosures * 1.5) {
      issues.push({
        level: 'amber',
        msg: `לפי אחוז הסגירה שלך (${sp.closingRate}%), מ-${qCalls} שיחות תצפה ל~${expectedClosures} סגירות — אבל הגדרת ${qClosures}. `
          + `הגדל את השיחות או עדכן את אחוז הסגירה.`,
      })
    }
  }

  // 5. Empty revenue target
  if (!qRevenue && (qLeads || qCalls || qClosures)) {
    issues.push({
      level: 'info',
      msg: 'יש יעדי פעילות אבל אין יעד הכנסות — הוסף יעד הכנסות כדי שהמערכת תוכל לנתח.`',
    })
  }

  return issues
}

function RealismBanner({ issues }) {
  if (!issues.length) return null
  const topLevel = issues.some(i => i.level === 'red') ? 'red' : issues.some(i => i.level === 'amber') ? 'amber' : 'info'
  const bg = topLevel === 'red' ? 'bg-red-50 border-red-200' : topLevel === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
  const textHead = topLevel === 'red' ? 'text-red-700' : topLevel === 'amber' ? 'text-amber-700' : 'text-blue-700'
  const icon = topLevel === 'red' ? '🚨' : topLevel === 'amber' ? '⚠️' : 'ℹ️'

  return (
    <div className={`rounded-xl border p-3.5 space-y-2 ${bg}`}>
      <p className={`text-xs font-black uppercase tracking-wide ${textHead}`}>{icon} בדיקת ריאליות</p>
      {issues.map((issue, i) => (
        <p key={i} className={`text-xs leading-relaxed ${textHead === 'text-red-700' ? 'text-red-600' : textHead === 'text-amber-700' ? 'text-amber-700' : 'text-blue-600'}`}>
          {issue.msg}
        </p>
      ))}
    </div>
  )
}

export default function QuarterlySection() {
  const { quarterly, updateQuarterly, updateQuarterlyMove, profile } = useStore()
  const period = usePeriod()
  const q = quarterly || {}

  const realismIssues = computeRealismIssues(q, profile)

  return (
    <div className="space-y-4">
      {/* Period badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
          {q.quarter || period.quarter} {q.year || period.year}
        </span>
        {q.status === 'active' && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">פעיל</span>
        )}
      </div>

      {/* KPI Targets */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 mb-4">יעדי רבעון</h3>
        <div className="grid grid-cols-2 gap-4">
          <EditableField
            label="הכנסות"
            hint="יעד ההכנסות הרבעוני — חלק את היעד השנתי ל-4 ואז תאם לעונתיות. Q1 לרוב חלש יותר, Q4 חזק."
            type="currency"
            value={q.revenueTarget}
            formatDisplay={v => formatCurrency(v)}
            onSave={v => updateQuarterly('revenueTarget', v)}
          />
          <EditableField
            label="לידים"
            hint="כמה לידים רלוונטיים אתה צריך ברבעון כדי לפגוש את יעד ההכנסות, לפי אחוז הסגירה שלך."
            type="number"
            value={q.leadsTarget}
            onSave={v => updateQuarterly('leadsTarget', v)}
          />
          <EditableField
            label="שיחות"
            hint="כמה שיחות מכירה ייצרו את הסגירות הדרושות? חשב: יעד סגירות ÷ אחוז סגירה."
            type="number"
            value={q.callsTarget}
            onSave={v => updateQuarterly('callsTarget', v)}
          />
          <EditableField
            label="סגירות"
            hint="כמה עסקאות חדשות אתה צריך לסגור ברבעון? חשב: יעד הכנסות ÷ מחיר ממוצע לעסקה."
            type="number"
            value={q.closuresTarget}
            onSave={v => updateQuarterly('closuresTarget', v)}
          />
        </div>

        {/* Realism check — shows live when targets are filled */}
        {realismIssues.length > 0 && (
          <div className="mt-4">
            <RealismBanner issues={realismIssues} />
          </div>
        )}
      </Card>

      {/* 3 Key Moves */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 mb-1">3 מהלכי מפתח</h3>
        <p className="text-xs text-slate-400 mb-4">מה ה-3 דברים שאם תעשה אותם הרבעון הזה — הכל ישתנה?</p>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-brand-500 font-black text-lg shrink-0 leading-none mt-2">{i + 1}</span>
              <div className="flex-1">
                <EditableField
                  label={`מהלך ${i + 1}`}
                  hint={
                    i === 0
                      ? 'המהלך הכי קריטי — זה שמניע את ההכנסות ישירות. לדוגמה: "להשיק תכנית קבוצתית של ₪3,000 ולמכור 10 מקומות".'
                      : i === 1
                      ? 'המהלך השני בחשיבות — בונה את הבסיס לצמיחה. לדוגמה: "לבנות שגרת תוכן שבועית עם 3 פוסטים".'
                      : 'המהלך השלישי — לרוב נוגע לתשתית, תהליכים, או אנשים. לדוגמה: "לגייס VA שיחסוך לי 8 שעות שבועיות".'
                  }
                  type="textarea"
                  value={(q.threeKeyMoves || [])[i] || ''}
                  onSave={v => updateQuarterlyMove(i, v)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Habit + Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4">
          <EditableField
            label="ההרגל המרכזי"
            hint="איזה הרגל יום-יומי תבנה ברבעון הזה שייתן לך את הבסיס לשנה? בחר אחד — לא חמישה. לדוגמה: '30 דקות מדי בוקר לכתיבת תוכן לפני כל דבר אחר'."
            type="textarea"
            value={q.habit}
            onSave={v => updateQuarterly('habit', v)}
          />
        </Card>
        <Card className="p-4">
          <EditableField
            label="מה עלול להפיל אותי"
            hint="מה הסיכון הכי גדול שעלול למנוע ממך להשיג את היעד? לדוגמה: 'אלחץ ויחזור הדפוס שאני בורח לניהול במקום למכירות'. כתוב את זה עכשיו — הכרה היא הגנה."
            type="textarea"
            value={q.risk}
            onSave={v => updateQuarterly('risk', v)}
          />
        </Card>
      </div>
    </div>
  )
}
