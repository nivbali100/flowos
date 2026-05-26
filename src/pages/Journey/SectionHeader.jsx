import { forwardRef } from 'react'

const SectionHeader = forwardRef(function SectionHeader({ letter, title, subtitle }, ref) {
  return (
    <div ref={ref} className="flex items-center gap-3 pt-8 pb-4 scroll-mt-4">
      {letter && (
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-sm font-black text-white leading-none">{letter}</span>
        </div>
      )}
      <div className="flex-1 border-b border-slate-100 pb-2">
        <h2 className="text-lg font-black text-slate-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
})

export default SectionHeader
