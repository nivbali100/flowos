/**
 * StartingPoint — section א in Journey
 * All fields editable via EditableField + useStore.
 */
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EditableField from '../../components/ui/EditableField.jsx'
import { useStore } from '../../hooks/useStore.js'
import { formatCurrency } from '../../utils/formatters.js'

// ─── Blocking Patterns — up to 5, array-style ────────────────────────────────
function BlockingPatterns({ patterns, onUpdate }) {
  const list = patterns?.length ? patterns : ['']
  const canAdd = list.length < 5

  function handleChange(idx, val) {
    const next = [...list]
    next[idx] = val
    onUpdate(next)
  }

  function handleAdd() {
    if (!canAdd) return
    onUpdate([...list, ''])
  }

  function handleRemove(idx) {
    if (list.length <= 1) {
      onUpdate([''])
      return
    }
    onUpdate(list.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-700">דפוסים מעכבים</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            דפוס = משהו שחוזר על עצמו בכל פעם שמתקדמים. אפשר 3–5 דפוסים — כן יותר.
          </p>
        </div>
        {canAdd && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg transition-colors shrink-0 mt-0.5"
          >
            <Plus className="w-3 h-3" /> הוסף
          </button>
        )}
      </div>
      <div className="space-y-2">
        {list.map((pattern, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-2.5">
              {idx + 1}
            </div>
            <textarea
              rows={2}
              value={pattern}
              onChange={e => handleChange(idx, e.target.value)}
              placeholder={
                idx === 0
                  ? 'לדוגמה: כשמתחיל ללחות אני בורח לטכניקה במקום למכירות...'
                  : `דפוס ${idx + 1}...`
              }
              className="flex-1 text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {list.length > 1 && (
              <button
                onClick={() => handleRemove(idx)}
                className="mt-2.5 text-slate-300 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StartingPoint() {
  const { profile, updateStartingPoint } = useStore()
  const sp = profile?.startingPoint || {}

  const bizFields = [
    {
      key: 'avgMonthlyRevenue',
      label: 'הכנסה חודשית ממוצעת',
      type: 'currency',
      hint: 'ממוצע ההכנסות ב-3 חודשים האחרונים לפני תחילת ליווי. כולל את כל מקורות ההכנסה מהעסק.',
      formatDisplay: v => formatCurrency(v),
    },
    {
      key: 'avgMonthlyProfit',
      label: 'רווח חודשי ממוצע',
      type: 'currency',
      hint: 'הכנסות פחות הוצאות — כמה נשאר בפועל בידיים. אם אין נתון מדויק, תאמוד.',
      formatDisplay: v => formatCurrency(v),
    },
    {
      key: 'monthlyLeads',
      label: 'לידים חודשיים',
      type: 'number',
      hint: 'כמה פניות / ליידים רלוונטיים אתה מקבל בחודש ממוצע.',
    },
    {
      key: 'monthlyCalls',
      label: 'שיחות חודשיות',
      type: 'number',
      hint: 'כמה שיחות מכירה / פגישות אתה עושה בחודש (לא כולל שיחות שירות).',
    },
    {
      key: 'closingRate',
      label: 'אחוז סגירה',
      type: 'percent',
      hint: 'מכל 10 שיחות מכירה — כמה נסגרות? לדוגמה: 3 מתוך 10 = 30%.',
      formatDisplay: v => `${v}%`,
    },
  ]

  const founderSliders = [
    {
      key: 'confidence',
      label: 'ביטחון עצמי',
      hint: '1 = "אני לא בטוח שאני יכול להצליח", 10 = "אני בטוח לחלוטין בדרכי". היה כן.',
      color: '#6366f1',
    },
    {
      key: 'clarity',
      label: 'בהירות עסקית',
      hint: '1 = "לא ברור לי מה אני עושה", 10 = "יש לי תוכנית ברורה ואני יודע למה כל דבר".',
      color: '#3b82f6',
    },
    {
      key: 'discipline',
      label: 'משמעת',
      hint: '1 = "אני כל הזמן דוחה ומתפזר", 10 = "אני עובד לפי תוכנית בלי תירוצים".',
      color: '#10b981',
    },
    {
      key: 'mentalResilience',
      label: 'חוסן מנטלי',
      hint: '1 = "כל מכשול מפיל אותי", 10 = "אני קם מהר מכישלונות ומתמיד".',
      color: '#f59e0b',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Business Metrics */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 mb-4">מצב העסק היום</h3>
        <div className="grid grid-cols-2 gap-4">
          {bizFields.map(f => (
            <EditableField
              key={f.key}
              label={f.label}
              hint={f.hint}
              type={f.type}
              value={sp[f.key]}
              formatDisplay={f.formatDisplay}
              onSave={v => updateStartingPoint(f.key, v)}
            />
          ))}
        </div>

        {/* Runway + Cash — split into 2 fields */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
          <EditableField
            label="חודשי מסלול (Runway)"
            hint="כמה חודשים העסק יכול לשרוד ללא הכנסות חדשות? לדוגמה: 3 = שלושה חודשי מסלול."
            type="number"
            value={sp.runwayMonths}
            formatDisplay={v => `${v} חודשים`}
            onSave={v => updateStartingPoint('runwayMonths', v)}
          />
          <EditableField
            label="מזומן / חיסכון פנוי"
            hint="כמה כסף זמין יש לך כרגע — בחשבון עסקי או חיסכון נגיש. לא כולל נכסים."
            type="currency"
            value={sp.freeCashAmount}
            formatDisplay={v => formatCurrency(v)}
            onSave={v => updateStartingPoint('freeCashAmount', v)}
          />
        </div>
      </Card>

      {/* Founder State — sliders */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 mb-4">מצב היזם</h3>
        <div className="space-y-5">
          {founderSliders.map(f => (
            <div key={f.key}>
              <EditableField
                label={f.label}
                hint={f.hint}
                type="slider"
                value={sp[f.key] ?? 5}
                onSave={v => updateStartingPoint(f.key, v)}
              />
              {/* Visual bar (read-only, shows current saved value) */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(sp[f.key] || 5) * 10}%`, backgroundColor: f.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Deep Questions */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 mb-4">שאלות עומק</h3>
        <div className="space-y-5">
          <EditableField
            label="איפה אני באמת תקוע כרגע בעסק"
            hint="תאר את החסם העיקרי שמונע ממך לצמוח. אל תכתוב סימפטומים — כתוב את השורש. לדוגמה: 'אני לא סוגר עסקאות כי אני מפחד לשאול את המחיר'."
            type="textarea"
            value={sp.whereStuck}
            onSave={v => updateStartingPoint('whereStuck', v)}
          />

          {/* Blocking patterns — multi-entry */}
          <BlockingPatterns
            patterns={sp.blockingPatterns}
            onUpdate={arr => updateStartingPoint('blockingPatterns', arr)}
          />

          <EditableField
            label="איפה אני בורח כשנהיה לא נוח"
            hint="לאן אתה בורח כשלחץ עולה? עבודה אדמינסטרטיבית? רשתות חברתיות? 'מחקר'? הסחת דעת? כתוב בכנות."
            type="textarea"
            value={sp.escapePattern}
            onSave={v => updateStartingPoint('escapePattern', v)}
          />
        </div>
      </Card>
    </div>
  )
}
