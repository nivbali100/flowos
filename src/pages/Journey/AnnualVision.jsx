/**
 * AnnualVision — section ב in Journey
 * All fields editable via EditableField + useStore.
 */
import Card from '../../components/ui/Card.jsx'
import EditableField from '../../components/ui/EditableField.jsx'
import { useStore } from '../../hooks/useStore.js'
import { formatCurrency } from '../../utils/formatters.js'

export default function AnnualVision() {
  const { profile, updateAnnualGoals } = useStore()
  const ag = profile?.annualGoals || {}

  return (
    <Card className="p-5 space-y-5">
      {/* Revenue & Profitability */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-50 rounded-xl p-4">
          <EditableField
            label="יעד הכנסות שנתי"
            hint="כמה כסף תכניס מהעסק בשנה זו? שים יעד שמאתגר אותך אבל נשאר מציאותי — לא חלום, לא קל מדי."
            type="currency"
            value={ag.revenueTarget}
            formatDisplay={v => (
              <span className="text-2xl font-black text-brand-700">{formatCurrency(v)}</span>
            )}
            onSave={v => updateAnnualGoals('revenueTarget', v)}
          />
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <EditableField
            label="יעד רווחיות"
            hint="איזה אחוז מההכנסות ישאר בידיים כרווח? לדוגמה: 40% מ-₪500K = ₪200K נקי. חשב הוצאות לפני שתקבע."
            type="percent"
            value={ag.profitabilityTarget}
            formatDisplay={v => (
              <span className="text-2xl font-black text-slate-800">{v}%</span>
            )}
            onSave={v => updateAnnualGoals('profitabilityTarget', v)}
          />
        </div>
      </div>

      {/* Community / Activity Goal */}
      <div className="bg-slate-50 rounded-xl p-4">
        <EditableField
          label="יעד קהילה / פעילות"
          hint="מה אתה בונה מעבר להכנסות? קהילה, קורס, קבוצה, מוצר חדש, רשת קשרים? רשום בדיוק."
          type="text"
          value={ag.communityTarget}
          onSave={v => updateAnnualGoals('communityTarget', v)}
        />
      </div>

      {/* Identity */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
        <EditableField
          label="מי אני נהיה השנה"
          hint="זהות היא הכלי הכי חזק לשינוי. כתוב: 'אני בן אדם שמוכר בלי לחכות שיפנו אליו', 'אני מנהיג שמוביל קהילה של X'. כתוב בהווה, כאילו כבר קורה."
          type="textarea"
          value={ag.identity}
          onSave={v => updateAnnualGoals('identity', v)}
        />
      </div>
    </Card>
  )
}
