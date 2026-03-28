import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { useResizable } from '../hooks/useResizable'
import { useTasks } from '../hooks/useTasks'
import { useNotes } from '../hooks/useNotes'
import { useProjectsContext } from '../lib/ProjectsContext'
import TaskTableView from '../components/tasks/TaskTableView'
import NoteListView from '../components/notes/NoteListView'
import { cn } from '../lib/cn'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#f97316', '#8b5cf6', '#14b8a6', '#ef4444', '#64748b']

const TABS = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
]

export default function ProjectView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { activeTab, setActiveTab, registerNewHandler } = useOutletContext()
  const { projects, updateProject } = useProjectsContext()
  const project = projects.find(p => p.id === id)
  const navStateHandled = useRef(false)
  const [renamingProject, setRenamingProject] = useState(false)
  const [projectName, setProjectName] = useState('')
  const renameInputRef = useRef(null)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const colorPickerRef = useRef(null)

  useEffect(() => {
    if (!colorPickerOpen) return
    function handler(e) { if (!colorPickerRef.current?.contains(e.target)) setColorPickerOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colorPickerOpen])

  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask } = useTasks(id)
  const { notes, loading: notesLoading, createNote, updateNote, deleteNote } = useNotes(id)

  const { width: contentWidth, startResize } = useResizable({
    defaultWidth: 960, minWidth: 480, maxWidth: 1600, flip: true,
  })

  // Register +New handler based on active tab
  useEffect(() => {
    if (activeTab === 'tasks') {
      registerNewHandler(() => document.dispatchEvent(new CustomEvent('open-add-task')))
    } else {
      registerNewHandler(() => document.dispatchEvent(new CustomEvent('open-add-note')))
    }
  }, [activeTab, registerNewHandler])

  // Redirect if project deleted
  useEffect(() => {
    if (!project && projects.length > 0) navigate('/dashboard')
  }, [project, projects.length, navigate])

  // Apply navigation state from dashboard / search (switch tab, highlight task or open note)
  useEffect(() => {
    if (navStateHandled.current) return
    const state = location.state
    if (!state) return
    navStateHandled.current = true
    if (state.tab) setActiveTab(state.tab)
    // Clear state so back-navigation doesn't re-apply it
    window.history.replaceState({}, '')
  }, [location.state, setActiveTab])

  function startRenameProject() {
    setProjectName(project.name)
    setRenamingProject(true)
    setTimeout(() => renameInputRef.current?.select(), 0)
  }

  async function commitRenameProject() {
    const trimmed = projectName.trim()
    if (trimmed && trimmed !== project.name) await updateProject(id, { name: trimmed })
    setRenamingProject(false)
  }

  if (!project) return null

  return (
    <div className="relative" style={{ width: contentWidth, maxWidth: '100%' }}>
      {/* Right-edge resize handle */}
      <div
        onMouseDown={startResize}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-blue-500/30 transition-colors z-10"
      />

      {/* Project header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative shrink-0" ref={colorPickerRef}>
          <button
            onClick={() => setColorPickerOpen(v => !v)}
            title="Change color"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold hover:opacity-80 transition-opacity"
            style={{ backgroundColor: project.color ?? '#6366f1' }}>
            {project.name[0]}
          </button>
          {colorPickerOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2.5 flex flex-wrap gap-2 w-[132px]">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { updateProject(id, { color: c }); setColorPickerOpen(false) }}
                  className="w-6 h-6 rounded-full hover:scale-110 transition-transform"
                  style={{ backgroundColor: c, outline: project.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0">
          {renamingProject ? (
            <input
              ref={renameInputRef}
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              onBlur={commitRenameProject}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitRenameProject() }
                if (e.key === 'Escape') { setRenamingProject(false) }
              }}
              className="text-base font-semibold text-slate-900 dark:text-white bg-transparent border-b border-blue-500 outline-none w-full"
            />
          ) : (
            <h2
              className="text-base font-semibold text-slate-900 dark:text-white truncate cursor-text hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={startRenameProject}
              title="Click to rename"
            >
              {project.name}
            </h2>
          )}
          {project.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{project.description}</p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-5 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(({ id: tabId, label }) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tabId
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        tasksLoading ? <LoadingRows /> : (
          <TaskTableView
            tasks={tasks}
            project={project}
            onCreateTask={createTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onUpdateProject={updateProject}
            highlightTaskId={location.state?.highlightTaskId}
          />
        )
      )}

      {/* Notes tab */}
      {activeTab === 'notes' && (
        notesLoading ? <LoadingRows /> : (
          <NoteListView
            notes={notes}
            project={project}
            onCreateNote={createNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            onUpdateProject={updateProject}
            initialOpenNoteId={location.state?.openNoteId}
          />
        )
      )}
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 rounded bg-slate-200 dark:bg-slate-700" style={{ width: `${50 + i * 8}%` }} />
        </div>
      ))}
    </div>
  )
}
