import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'

const TABS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/project',   icon: FolderOpen,      label: 'Projects' },
]

export default function BottomTabBar({ onCapture }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-10 flex flex-col bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800"
    >
      <div className="flex items-center h-16">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center justify-center gap-1 h-full min-h-[44px] text-xs font-medium transition-colors',
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <Icon size={22} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}

        {/* Floating capture button — sits above the bar */}
        <button
          onClick={onCapture}
          className="absolute right-5 -top-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          aria-label="Quick capture"
        >
          <Plus size={22} strokeWidth={2} />
        </button>

        {/* Spacer so the last tab doesn't sit behind the float button */}
        <div className="w-16 shrink-0" />
      </div>

      {/* iPhone home-indicator safe area */}
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  )
}
