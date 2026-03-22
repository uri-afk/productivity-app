import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, Search } from 'lucide-react'
import { cn } from '../../lib/cn'

const TABS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home'     },
  { to: '/project/1', icon: FolderOpen,      label: 'Projects' },
  { to: '/search',    icon: Search,           label: 'Search'   },
]

export default function BottomTabBar() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-10 h-16 flex items-center bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 safe-area-inset-bottom">
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/dashboard'}
          className={({ isActive }) => cn(
            'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
            isActive
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <Icon size={20} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
