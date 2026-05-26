import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Map, Target, CheckSquare, BarChart2, Shield, Zap, BookOpen, ListChecks, Flame, Settings } from 'lucide-react'
import { useStore } from '../../hooks/useStore.js'

// 🔑 אימייל המנהל — שנה לאימייל שלך כדי לראות את דשבורד המלווים בסיידבר
const ADMIN_EMAIL = 'niv@flowos.app'

// Grouped navigation with section labels
const NAV_GROUPS = [
  {
    label: 'ראשי',
    items: [
      { path: '/dashboard', label: 'בית',          icon: Home },
      { path: '/rules',     label: 'כללי המשחק',   icon: BookOpen, hint: 'קרא קודם' },
      { path: '/onboarding',label: 'צעדי פתיחה',   icon: ListChecks },
    ],
  },
  {
    label: 'מערכת הניהול',
    items: [
      { path: '/',          label: 'יומן מסע',     icon: Map, exact: true },
      { path: '/goals',     label: 'יעדים',         icon: Target },
      { path: '/daily',     label: 'ביצוע יומי',    icon: Flame, hint: 'מצב עבודה' },
      { path: '/weekly',    label: 'לוח שבועי',     icon: CheckSquare },
      { path: '/performance',label: 'ביצועים',      icon: BarChart2 },
    ],
  },
]

const ADMIN_NAV = [
  { path: '/admin', label: 'ניהול מתאמנים', icon: Shield },
]

function NavItem({ path, label, icon: Icon, hint, exact }) {
  return (
    <NavLink
      to={path}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
          <span className="flex-1">{label}</span>
          {hint && (
            <span className="text-[9px] font-black bg-brand-600 text-white px-1.5 py-0.5 rounded-full leading-none">
              {hint}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { profile } = useStore()
  const navigate = useNavigate()

  const userName    = profile?.name || ''
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?'
  const userEmail   = profile?.email || ''
  const isAdmin     = userEmail === ADMIN_EMAIL

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-l border-slate-200 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-bold text-slate-900">FlowOS</span>
        <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">הפסגה</span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.path} {...item} />
              ))}
            </div>
          </div>
        ))}

        {/* Admin — shown only to the coach (ADMIN_EMAIL) */}
        {isAdmin && (
          <div className="pt-2 border-t border-slate-100">
            <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ניהול</div>
            <div className="space-y-0.5">
              {ADMIN_NAV.map((item) => (
                <NavItem key={item.path} {...item} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer — click to open profile settings */}
      <div className="px-3 py-3 border-t border-slate-100">
        <button
          onClick={() => navigate('/profile')}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-black text-brand-700 shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 text-right min-w-0">
            {userName
              ? <div className="text-xs font-semibold text-slate-800 truncate">{userName}</div>
              : <div className="text-xs text-slate-400 italic">הגדר פרופיל</div>
            }
            {userEmail
              ? <div className="text-[10px] text-slate-400 truncate">{userEmail}</div>
              : <div className="text-[10px] text-brand-500">לחץ להגדרה →</div>
            }
          </div>
          <Settings className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
        </button>
      </div>
    </aside>
  )
}
