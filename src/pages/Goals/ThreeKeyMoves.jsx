import { Zap } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import SectionHeader from '../../components/ui/SectionHeader.jsx'

export default function ThreeKeyMoves({ moves }) {
  return (
    <Card className="p-4">
      <SectionHeader title="3 Key Moves" subtitle="The strategic plays that define this period" className="mb-3" />
      <div className="space-y-2">
        {moves.map((move, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-brand-600">{i + 1}</span>
            </div>
            <span className="text-sm text-slate-700">{move}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
