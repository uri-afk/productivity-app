import { useLocation, matchPath } from 'react-router-dom'
import { Menu, Plus } from 'lucide-react'
import { useProjectsContext } from '../../lib/ProjectsContext'

function usePageTitle() {
  const { pathname } = useLocation()
  const { projects } = useProjectsContext() ?? { projects: [] }
  const match = matchPath('/project/:id', pathname)
  if (match) return projects.find(p => p.id === match.params.id)?.name ?? 'Project'
  if (pathname === '/dashboard') return 'Dashboard'
  return ''
}

export default function TopNav({ onMenuClick, onNew }) {
  const title = usePageTitle()

  return (
    <header className="shrink-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
    <div className="h-14 flex items-center gap-3 px-4">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <Menu size={18} />
      </button>

      <h1 className="text-sm font-semibold text-slate-900 dark:text-white flex-1 truncate">{title}</h1>

      <button
        onClick={onNew}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
        <Plus size={14} strokeWidth={2.5} />
        <span className="hidden sm:inline">New</span>
      </button>
    </div>
    </header>
  )
}
