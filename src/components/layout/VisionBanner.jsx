/**
 * VisionBanner — persistent strip at the top of every page.
 * Shows annual revenue target + community goal as a constant reminder of the destination.
 */
import { useData } from '../../hooks/useData.js'
import { formatCurrency } from '../../utils/formatters.js'
import { Target } from 'lucide-react'

export default function VisionBanner() {
  const user  = useData('user')
  const goals = user?.annualGoals

  if (!goals?.revenueTarget) return null

  return (
    <div className="bg-brand-600 px-4 md:px-6 py-2">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="w-3.5 h-3.5 text-brand-200 shrink-0" />
          <span className="text-xs font-bold text-brand-100 shrink-0">המטרה שלי {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium overflow-hidden">
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-brand-300">הכנסות:</span>
            <span className="text-white font-black">{formatCurrency(goals.revenueTarget)}</span>
          </div>
          {goals.communityTarget && (
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <span className="text-brand-300">קהילה:</span>
              <span className="text-white font-bold">{goals.communityTarget}</span>
            </div>
          )}
          {goals.identity && (
            <div className="hidden md:block text-brand-200 truncate min-w-0 italic text-[11px]">
              "{goals.identity}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
