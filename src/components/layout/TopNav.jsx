import { useLocation, matchPath } from 'react-router-dom'
import { Menu, Plus, List, LayoutGrid, Table2 } from 'lucide-react'
import { useProjectsContext } from '../../lib/ProjectsContext'
import { cn } from '../../lib/cn'

const VIEWS = [
  { id: 'list',  label: 'List',  Icon: List      },
  { id: 'board', label: 'Board', Icon: LayoutGrid },
  { id: 'table', label: 'Table', Icon: Table2     },
]

function usePageTitle() {
  const { pathname } = useLocation()
  const { projects } = useProjectsContext() ?? { projects: [] }
  const match = matchPath('/project/:id', pathname)
  if (match) {
    return projects.find(p => p.id === match.params.id)?.name ?? 'Project'
  }
  if (pathname === '/dashboard') return 'Dashboard'
  return ''
}

export default function TopNav({ view, onViewChange, onMenuClick, onNew, activeTab }) {
  const title = usePageTitle()
  const isProject = useLocation().pathname.startsWith('/project/')

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Menu size={18} />
      </button>

      <h1 className="text-sm font-semibold text-slate-900 dark:text-white flex-1 truncate">{title}</h1>

      {/* View toggle — only on project tasks tab */}
      {isProject && activeTab === 'tasks' && (
        <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-0.5">
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              title={label}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                view === id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <Icon size={13} strokeWidth={1.75} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onNew}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
      >
        <Plus size={14} strokeWidth={2.5} />
        <span className="hidden sm:inline">New</span>
      </button>
    </header>
  )
}
