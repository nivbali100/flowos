import { Crosshair } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'

export default function WeeklyFocus({ focus }) {
  return (
    <Card className="p-4 bg-brand-50 border-brand-100">
      <div className="flex gap-3 items-start">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Crosshair className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">This Week's Focus</div>
          <p className="text-sm font-semibold text-slate-800">{focus}</p>
        </div>
      </div>
    </Card>
  )
}
