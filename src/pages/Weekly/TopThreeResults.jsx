import { CheckCircle2, Circle } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import SectionHeader from '../../components/ui/SectionHeader.jsx'

export default function TopThreeResults({ results }) {
  return (
    <Card className="p-4">
      <SectionHeader title="Top 3 Results" subtitle="Committed outcomes for this week" className="mb-3" />
      <div className="space-y-2.5">
        {results.map((r, i) => (
          <div key={r.id} className="flex items-center gap-3">
            {r.status === 'done'
              ? <CheckCircle2 className="w-5 h-5 text-status-green flex-shrink-0" />
              : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
            }
            <span className={`text-sm flex-1 ${r.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {r.text}
            </span>
            <span className="text-xs font-bold text-slate-400">{i + 1}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
