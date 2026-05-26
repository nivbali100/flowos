import { NavLink } from 'react-router-dom'
import { Map, Target, CheckSquare, Home, UserCircle } from 'lucide-react'
import { useStore } from '../../hooks/useStore.js'

const NAV_ITEMS = [
  { path: '/profile',   label: 'פרופיל', icon: UserCircle },
  { path: '/',          label: 'יומן',   icon: Map,         exact: true },
  { path: '/goals',     label: 'יעדים',  icon: Target },
  { path: '/weekly',    label: 'שבוע',   icon: CheckSquare, badge: true },
  { path: '/dashboard', label: 'בית',    icon: Home },
]

export default function BottomNav() {
  const { tasks } = useStore()
  const activeTasks = tasks.filter(t => t.status === 'today' || t.status === 'doing').length

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Gradient fade at top of nav */}
      <div className="h-4 bg-gradient-to-b from-transparent to-white/80 pointer-events-none" />
      <div className="bg-white/96 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around px-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
          {NAV_ITEMS.map(({ path, label, icon: Icon, exact, badge }) => (
            <NavLink
              key={path}
              to={path}
              end={exact}
              className="flex flex-col items-center py-1.5 px-1 min-w-0 flex-1 active:scale-90 transition-transform duration-100"
            >
              {({ isActive }) => (
                <div className="flex flex-col items-center gap-0.5 w-full">
                  {/* Icon container with active pill */}
                  <div className={`relative flex items-center justify-center w-12 h-8 rounded-2xl transition-all duration-200 ${
                    isActive ? 'bg-brand-100 scale-105' : 'scale-100'
                  }`}>
                    <Icon
                      className={`transition-all duration-200 ${
                        isActive ? 'w-[22px] h-[22px] text-brand-600' : 'w-5 h-5 text-slate-400'
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />

                    {/* Badge */}
                    {badge && activeTasks > 0 && (
                      <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-black flex items-center justify-center leading-none ${
                        isActive ? 'bg-brand-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {activeTasks > 9 ? '9+' : activeTasks}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span className={`text-[10px] transition-all duration-200 ${
                    isActive ? 'font-black text-brand-600' : 'font-medium text-slate-400'
                  }`}>
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
