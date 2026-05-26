import { AlertTriangle } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'

export default function RiskCard({ risk }) {
  return (
    <Card className="p-4 border-status-yellowBg bg-status-yellowBg">
      <div className="flex gap-3">
        <AlertTriangle className="w-4 h-4 text-status-yellow flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-semibold text-status-yellowText mb-1 uppercase tracking-wide">Risk Factor</div>
          <p className="text-sm text-slate-700">{risk}</p>
        </div>
      </div>
    </Card>
  )
}
