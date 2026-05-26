import { useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import { ChevronDown, ChevronUp } from 'lucide-react'

const RULES = [
  'המערכת בנויה כדי לשרת אותך — לא להעמיס עליך. היא עוזרת לך לשמור על כיוון.',
  'מלא את הטופס השבועי בכל סוף שבוע — זה הנתונים שמזינים את הכל.',
  'הכל מתחיל מבפנים: קודם הבנה, אחר כך כיוון, אחר כך פירוק, אחר כך ביצוע.',
  'ירוק = בקצב. צהוב = יש פער קטן. אדום = יש פער — זה לא שיפוט, זה מידע.',
  'אל תשווה את עצמך לאחרים. השוואה היחידה היא לעצמך של שבוע שעבר.',
  'המטרה: לעמוד במילה. כל יום. כל שבוע. 90 יום ברצף.',
]

export default function OpeningRules() {
  const [open, setOpen] = useState(false)

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-card-hover transition-shadow"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-brand-600">📋</span>
          <span className="text-sm font-bold text-slate-800">כללי הליווי</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </div>
      {open && (
        <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {RULES.map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="text-brand-400 font-bold shrink-0">{i + 1}.</span>
              <span className="leading-relaxed">{rule}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
