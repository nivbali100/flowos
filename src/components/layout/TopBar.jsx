import PeriodBreadcrumb from './PeriodBreadcrumb.jsx'

export default function TopBar({ title, subtitle, action }) {
  return (
    <div className="sticky top-0 z-40 flex flex-col gap-0.5 px-4 pt-4 pb-3 md:px-6 border-b border-slate-100/80 bg-white/90 backdrop-blur-md">
      <PeriodBreadcrumb />
      <div className="flex items-center justify-between mt-1 gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-xl font-black text-slate-900 truncate">{title}</h1>
          {subtitle && (
            <span className="text-xs font-medium text-slate-400 shrink-0 hidden sm:inline">{subtitle}</span>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
