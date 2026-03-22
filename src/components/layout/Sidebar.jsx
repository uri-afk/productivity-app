import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Search, FolderOpen, LogOut, Sun, Moon, X, MoreHorizontal, Pencil, Trash2, Check } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { signOut } from '../../lib/auth'
import { useTheme } from '../../lib/ThemeContext'
import { useProjectsContext } from '../../lib/ProjectsContext'
import { cn } from '../../lib/cn'

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
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

function ProjectItem({ project, onRename, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(project.name)
  const menuRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  function handleRenameSubmit(e) {
    e.preventDefault()
    if (name.trim()) onRename(project.id, name.trim())
    setRenaming(false)
  }

  if (renaming) {
    return (
      <form onSubmit={handleRenameSubmit} className="flex items-center gap-1 px-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color ?? '#6366f1' }} />
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={e => { if (e.key === 'Escape') { setName(project.name); setRenaming(false) } }}
          className="flex-1 text-sm bg-transparent border-b border-blue-500 outline-none text-slate-900 dark:text-white py-1"
        />
        <button type="submit" className="p-1 text-blue-600"><Check size={12} /></button>
      </form>
    )
  }

  return (
    <div className="relative group">
      <NavLink
        to={`/project/${project.id}`}
        className={({ isActive }) => cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors pr-8',
          isActive
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
        )}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color ?? '#6366f1' }} />
        <span className="flex-1 truncate">{project.name}</span>
      </NavLink>

      {/* Hover menu trigger */}
      <button
        onClick={(e) => { e.preventDefault(); setMenuOpen(v => !v) }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-opacity"
      >
        <MoreHorizontal size={13} />
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div ref={menuRef} className="absolute right-2 top-8 z-50 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 text-sm">
          <button
            onClick={() => { setMenuOpen(false); setRenaming(true) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Pencil size={12} /> Rename
          </button>
          <button
            onClick={() => { setMenuOpen(false); onDelete(project.id) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  const { dark, toggle } = useTheme()
  const { projects, updateProject, deleteProject } = useProjectsContext()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  async function handleRename(id, name) {
    await updateProject(id, { name })
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this project and all its tasks and notes?')) return
    await deleteProject(id)
    navigate('/dashboard')
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />
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
            <span className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight">Productivity</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" end />
          <NavItem to="/search" icon={Search} label="Search" />

          <div className="pt-5">
            <div className="flex items-center gap-1.5 px-3 mb-1.5">
              <FolderOpen size={11} className="text-slate-400 dark:text-slate-500" />
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Projects</p>
            </div>
            <div className="space-y-0.5">
              {projects.map(p => (
                <ProjectItem key={p.id} project={p} onRename={handleRename} onDelete={handleDelete} />
              ))}
              {projects.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-600 italic">No projects yet</p>
              )}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1 shrink-0">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {dark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{initials}</span>
            </div>
            <span className="flex-1 text-xs text-slate-600 dark:text-slate-400 truncate">{user?.email}</span>
            <button onClick={handleSignOut} title="Sign out" className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
