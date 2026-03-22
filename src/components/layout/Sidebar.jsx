import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Search, FolderOpen, LogOut, Sun, Moon, X } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { signOut } from '../../lib/auth'
import { useTheme } from '../../lib/ThemeContext'
import { PROJECTS } from '../../lib/mock'
import { cn } from '../../lib/cn'

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
      )}
    >
      <Icon size={16} strokeWidth={1.75} />
      {label}
    </NavLink>
  )
}

function ProjectItem({ project }) {
  return (
    <NavLink
      to={`/project/${project.id}`}
      className={({ isActive }) => cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group',
        isActive
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
      )}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: project.color }}
      />
      <span className="flex-1 truncate">{project.name}</span>
      <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums group-hover:text-slate-500">
        {project.taskCount}
      </span>
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <>
      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-30',
        'w-64 h-screen flex flex-col shrink-0',
        'bg-white dark:bg-slate-950',
        'border-r border-slate-200 dark:border-slate-800',
        'transition-transform duration-200 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>

        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight">
              Productivity
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/search"    icon={Search}          label="Search"    />

          {/* Projects */}
          <div className="pt-5">
            <div className="flex items-center gap-1.5 px-3 mb-1.5">
              <FolderOpen size={11} className="text-slate-400 dark:text-slate-500" />
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Projects
              </p>
            </div>
            <div className="space-y-0.5">
              {PROJECTS.map(p => <ProjectItem key={p.id} project={p} />)}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {dark
              ? <Sun size={16} strokeWidth={1.75} />
              : <Moon size={16} strokeWidth={1.75} />
            }
            {dark ? 'Light mode' : 'Dark mode'}
          </button>

          {/* User row */}
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {initials}
              </span>
            </div>
            <span className="flex-1 text-xs text-slate-600 dark:text-slate-400 truncate">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
