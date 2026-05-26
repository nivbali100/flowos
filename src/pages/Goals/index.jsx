/**
 * Goals page — fully editable quarterly + monthly goals.
 * Uses useStore for mutable data, usePeriod for period labels only.
 */
import TopBar from '../../components/layout/TopBar.jsx'
import Card from '../../components/ui/Card.jsx'
import EditableField from '../../components/ui/EditableField.jsx'
import { useStore } from '../../hooks/useStore.js'
import { useData } from '../../hooks/useData.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import { formatCurrency } from '../../utils/formatters.js'

function CascadeLevel({ label, value, pct, bg, borderColor, isLast }) {
  return (
    <div className="flex items-stretch gap-3">
      <div className="flex flex-col items-center w-6 shrink-0">
        <div className={`w-3 h-3 rounded-full border-2 ${borderColor} bg-white shrink-0`} />
        {!isLast && <div className={`w-0.5 flex-1 ${borderColor.replace('border-', 'bg-')}`} />}
      </div>
      <div className={`flex-1 rounded-xl p-3 mb-2 ${bg}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">{label}</span>
          {pct != null && (
            <span className="text-[10px] font-bold text-slate-400">{pct}% מהרמה מעל</span>
          )}
        </div>
        <div className="text-lg font-black text-slate-900 mt-0.5">{value}</div>
      </div>
    </div>
  )
}

export default function Goals() {
  const { quarterly, updateQuarterly, updateQuarterlyMove, monthly, updateMonthly, updateMonthlyMove, updateMonthlyActual } = useStore()
  const profile = useData('user')
  const period  = usePeriod()

  const q = quarterly || {}
  const m = monthly   || {}

  const annualRevenue   = profile?.annualGoals?.revenueTarget
  const quarterRevenue  = q.revenueTarget
  const monthRevenue    = m.revenueTarget

  return (
    <div>
      <TopBar title="יעדים" />
      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto space-y-6">

        {/* Goal Hierarchy Cascade */}
        {annualRevenue && (
          <Card className="p-4">
            <div className="text-xs font-semibold text-slate-400 mb-3">היררכיית יעדים</div>
            <CascadeLevel
              label="יעד שנתי"
              value={formatCurrency(annualRevenue)}
              pct={null}
              bg="bg-gradient-to-l from-brand-50 to-indigo-50"
              borderColor="border-brand-500"
            />
            <CascadeLevel
              label={period.quarter}
              value={quarterRevenue ? formatCurrency(quarterRevenue) : '—'}
              pct={quarterRevenue ? Math.round((quarterRevenue / annualRevenue) * 100) : null}
              bg="bg-indigo-50"
              borderColor="border-indigo-400"
            />
            <CascadeLevel
              label={period.month}
              value={monthRevenue ? formatCurrency(monthRevenue) : '—'}
              pct={monthRevenue && quarterRevenue ? Math.round((monthRevenue / quarterRevenue) * 100) : null}
              bg="bg-white ring-1 ring-indigo-200"
              borderColor="border-indigo-300"
            />
            <CascadeLevel
              label={period.weekLabel}
              value="שבועי"
              pct={null}
              bg="bg-slate-50"
              borderColor="border-slate-300"
              isLast
            />
          </Card>
        )}

        {/* ─── Quarterly Goals ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">יעדים רבעוניים — {period.quarter}</h2>
          <Card className="p-4 space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4">
              <EditableField
                label="הכנסות"
                hint="יעד ההכנסות לרבעון זה — פירוק פרופורציונלי מהיעד השנתי."
                type="currency"
                value={q.revenueTarget}
                formatDisplay={v => formatCurrency(v)}
                onSave={v => updateQuarterly('revenueTarget', v)}
              />
              <EditableField
                label="לידים"
                hint="כמה לידים רלוונטיים נדרשים ברבעון כדי לפגוש את יעד הסגירות."
                type="number"
                value={q.leadsTarget}
                onSave={v => updateQuarterly('leadsTarget', v)}
              />
              <EditableField
                label="שיחות"
                hint="כמה שיחות מכירה נדרשות? חשב: סגירות יעד ÷ אחוז סגירה."
                type="number"
                value={q.callsTarget}
                onSave={v => updateQuarterly('callsTarget', v)}
              />
              <EditableField
                label="סגירות"
                hint="כמה עסקאות חדשות לסגור ברבעון. יעד הכנסות ÷ מחיר ממוצע לעסקה."
                type="number"
                value={q.closuresTarget}
                onSave={v => updateQuarterly('closuresTarget', v)}
              />
            </div>

            {/* 3 Key Moves */}
            <div>
              <div className="text-sm font-semibold text-slate-700 mb-3">3 מהלכי מפתח</div>
              <div className="space-y-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-brand-500 font-black text-lg shrink-0 leading-none mt-1.5">{i + 1}</span>
                    <div className="flex-1">
                      <EditableField
                        label={`מהלך ${i + 1}`}
                        hint="פעולה גדולה ברמת הרבעון — לא משימה שבועית. מה שאם תעשה אותו הכל משתנה."
                        type="textarea"
                        value={(q.threeKeyMoves || [])[i] || ''}
                        onSave={v => updateQuarterlyMove(i, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Habit + Risk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <EditableField
                label="ההרגל המרכזי"
                hint="הרגל יומי שתבנה ברבעון זה. בחר אחד בלבד."
                type="textarea"
                value={q.habit}
                onSave={v => updateQuarterly('habit', v)}
              />
              <EditableField
                label="מה עלול להפיל אותי"
                hint="הסיכון הכי גדול לרבעון הזה — כתוב אותו כדי להיות מוכן."
                type="textarea"
                value={q.risk}
                onSave={v => updateQuarterly('risk', v)}
              />
            </div>
          </Card>
        </section>

        {/* ─── Monthly Goals ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">יעדים חודשיים — {period.month}</h2>
          <Card className="p-4 space-y-5">
            {/* KPIs — targets */}
            <div>
              <div className="text-sm font-semibold text-slate-700 mb-3">יעדים חודשיים</div>
              <div className="grid grid-cols-2 gap-4">
                <EditableField
                  label="הכנסות — יעד"
                  hint="יעד ההכנסות לחודש זה."
                  type="currency"
                  value={m.revenueTarget}
                  formatDisplay={v => formatCurrency(v)}
                  onSave={v => updateMonthly('revenueTarget', v)}
                />
                <EditableField
                  label="לידים — יעד"
                  hint="כמה לידים חדשים לייצר החודש."
                  type="number"
                  value={m.leadsTarget}
                  onSave={v => updateMonthly('leadsTarget', v)}
                />
                <EditableField
                  label="שיחות — יעד"
                  hint="כמה שיחות מכירה מתוכננות החודש."
                  type="number"
                  value={m.callsTarget}
                  onSave={v => updateMonthly('callsTarget', v)}
                />
                <EditableField
                  label="סגירות — יעד"
                  hint="כמה עסקאות חדשות לסגור החודש."
                  type="number"
                  value={m.closuresTarget}
                  onSave={v => updateMonthly('closuresTarget', v)}
                />
              </div>
            </div>

            {/* KPIs — actuals (real user data → feeds Dashboard + Performance) */}
            <div>
              <div className="text-sm font-semibold text-slate-700 mb-1">ביצוע בפועל</div>
              <div className="text-xs text-slate-400 mb-3">עדכן את המספרים האמיתיים — הם יופיעו בלוח הבקרה ובביצועים</div>
              <div className="grid grid-cols-2 gap-4">
                <EditableField
                  label="הכנסות — בפועל"
                  type="currency"
                  value={m.actualKPIs?.revenue ?? ''}
                  formatDisplay={v => formatCurrency(v)}
                  onSave={v => updateMonthlyActual('revenue', v)}
                />
                <EditableField
                  label="לידים — בפועל"
                  type="number"
                  value={m.actualKPIs?.leads ?? ''}
                  onSave={v => updateMonthlyActual('leads', v)}
                />
                <EditableField
                  label="שיחות — בפועל"
                  type="number"
                  value={m.actualKPIs?.calls ?? ''}
                  onSave={v => updateMonthlyActual('calls', v)}
                />
                <EditableField
                  label="סגירות — בפועל"
                  type="number"
                  value={m.actualKPIs?.closures ?? ''}
                  onSave={v => updateMonthlyActual('closures', v)}
                />
              </div>
            </div>

            {/* 3 Key Moves */}
            <div>
              <div className="text-sm font-semibold text-slate-700 mb-3">3 המהלכים הגדולים</div>
              <div className="space-y-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-brand-500 font-black text-lg shrink-0 leading-none mt-1.5">{i + 1}</span>
                    <div className="flex-1">
                      <EditableField
                        label={`מהלך ${i + 1}`}
                        hint="פעולה ספציפית שאם תגמור אותה החודש — המספרים ישתנו."
                        type="textarea"
                        value={(m.threeKeyMoves || [])[i] || ''}
                        onSave={v => updateMonthlyMove(i, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Habit + Risk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <EditableField
                label="ההרגל שאני מחזק"
                hint="ההרגל היומי לחודש זה — ספציפי עם זמן ותדירות."
                type="textarea"
                value={m.habit}
                onSave={v => updateMonthly('habit', v)}
              />
              <EditableField
                label="מה עלול להפיל אותי"
                hint="מה הסיכון הספציפי לחודש זה? כתוב ותכנן מראש."
                type="textarea"
                value={m.whatCouldFail}
                onSave={v => updateMonthly('whatCouldFail', v)}
              />
            </div>

            {/* Mental Entry */}
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
              <EditableField
                label="כניסה מנטלית לחודש"
                hint="ההתחייבות שלך לעצמך לחודש זה — כתוב בהווה כאנרגיה."
                type="textarea"
                value={m.mentalEntry}
                onSave={v => updateMonthly('mentalEntry', v)}
              />
            </div>
          </Card>
        </section>

      </div>
    </div>
  )
}
